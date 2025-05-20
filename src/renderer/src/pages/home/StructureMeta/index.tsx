import { REFERENCE_DOCUMENT_PROMPT, REFERENCE_TEMPLATE_PROMPT } from '@renderer/config/prompts'
import { useAssistant } from '@renderer/hooks/useAssistant'
import { fetchChatCompletion } from '@renderer/services/ApiService'
import { EVENT_NAMES, EventEmitter } from '@renderer/services/EventService'
import { checkRateLimit, getUserMessage } from '@renderer/services/MessagesService'
import store from '@renderer/store'
import { upsertManyBlocks } from '@renderer/store/messageBlock'
import { newMessagesActions } from '@renderer/store/newMessage'
import type { Assistant, InfoMetric, InfoStructure, Topic } from '@renderer/types'
import { Chunk, ChunkType } from '@renderer/types/chunk'
import { Button, Collapse, CollapseProps, Flex, Space, Tooltip } from 'antd'
import { isEmpty, map, toString } from 'lodash'
import { ChevronsDownUpIcon, ChevronsUpDownIcon, Edit3Icon, RefreshCcw, Search } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BarLoader from 'react-spinners/BarLoader'
import styled from 'styled-components'

const DEFAULT_OPERATION_PROMPT = {
  EXTRACT_CONTENTS: `根据上下文和网络查询数据，基于信息模板生成{companyName}企业信息，返回格式必须为合法 json 且不包含多余内容。`,
  REGEN_METRIC_VALUE: '根据新的提示词和上下文，生成该指标值'
}

const ExtractProgressTextMap = {
  [ChunkType.EXTERNEL_TOOL_IN_PROGRESS]: '正在联网搜索...',
  [ChunkType.LLM_RESPONSE_CREATED]: '正在识别信息模板...',
  [ChunkType.TEXT_DELTA]: '正在生成内容...',
  [ChunkType.TEXT_COMPLETE]: '完成'
}

const getStructureMetaDataSource = (json?: string) => {
  if (!json) return null
  try {
    const data = JSON.parse(json)
    return data
  } catch (error) {
    console.error(error)
    return null
  }
}

const extractFirstJsonFromMarkdown = (markdown: string): string => {
  const regex = /```json\s*([\s\S]*?)\s*```/g
  const matches = [...markdown.matchAll(regex)]
  return matches[0][1].trim()
}

interface _Props {
  assistant: Assistant
  topic: Topic
}
const StructureMeta: React.FC<_Props> = ({ assistant, topic }) => {
  const { t } = useTranslation()
  // const dispatch = useAppDispatch()

  const [expanded, setExpanded] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [extractProgressText, setExtractProgressText] = useState('')
  const [hasTempData, setHasTempData] = useState(false)

  const { assistant: currentAssistant, updateAssistant } = useAssistant(assistant.id)

  const { attachedTemplate, attachedDocument, prompt } = currentAssistant

  const structureMetaData: InfoStructure = useMemo(
    () =>
      attachedTemplate?.tempData ? attachedTemplate.tempData : getStructureMetaDataSource(attachedTemplate?.structure),
    [attachedTemplate]
  )

  console.log('--- attachedTemplate?.tempData', attachedTemplate?.tempData)

  useEffect(() => {
    if (!isEmpty(attachedTemplate?.tempData)) {
      setHasTempData(true)
    } else {
      setHasTempData(false)
    }
  }, [attachedTemplate?.tempData])

  // const allMetrics = useMemo(() => {
  //   if (!isEmpty(structureMetaData)) {
  //     let list: InfoMetric[] = []
  //     forEach(structureMetaData, (object) => {
  //       if (Array.isArray(object)) {
  //         list = list.concat(object)
  //       } else {
  //         list = list.concat(object.metrics)
  //       }
  //     })

  //     return list
  //   }
  //   return []
  // }, [structureMetaData]) as InfoMetric[]

  const getWebSearchContent = (metric?: InfoMetric) => {
    const entityName = attachedTemplate?.name
    if (metric) {
      return `${entityName} ${metric.name} ${metric.prompt}`
    } else {
      return `${entityName} 企业基本信息`
    }
  }

  const checkResponseText = (text: string) => {
    try {
      let jsonStr = text
      if (text.startsWith('```json')) {
        jsonStr = extractFirstJsonFromMarkdown(text)
      }
      const object = JSON.parse(jsonStr)
      if (attachedTemplate) {
        updateAssistant({
          ...currentAssistant,
          attachedTemplate: {
            ...attachedTemplate,
            tempData: object as InfoStructure
          }
        })
      }
    } catch (error) {
      console.error(error)
      window.modal.error({
        content: t('返回格式校验错误')
      })
    }
  }

  const clearTemplateTempData = () => {
    if (attachedTemplate) {
      updateAssistant({
        ...currentAssistant,
        attachedTemplate: {
          ...attachedTemplate,
          tempData: undefined
        }
      })
    }
  }

  const extractContent = useCallback(
    async (text: string) => {
      if (checkRateLimit(assistant)) {
        return
      }

      // reference file
      const files = attachedDocument && !attachedDocument.disabled ? [attachedDocument] : []
      const { message: userMessage, blocks } = getUserMessage({
        assistant,
        topic,
        content: text,
        files
      })

      console.log('--- userMessage ---', userMessage, blocks)

      let assistantPrompt = prompt
      if (!isEmpty(topic.attachedPages)) {
        const pageContent =
          topic.attachedPages?.reduce((acc, page) => acc + `\r\nIndex${page.index}: ${page.content}`, '') || ''
        const pagePrompt = REFERENCE_DOCUMENT_PROMPT.replace('{document_content}', pageContent)
        assistantPrompt = prompt ? `${prompt}\n${pagePrompt}` : pagePrompt
      }

      const templatePrompt = REFERENCE_TEMPLATE_PROMPT.replace('{company_template}', attachedTemplate?.structure || '')
      assistantPrompt = prompt ? `${prompt}\n${templatePrompt}` : templatePrompt

      const webSearchContent = getWebSearchContent()

      let blockContent = ''
      try {
        store.dispatch(newMessagesActions.addMessage({ topicId: topic.id, message: userMessage }))
        store.dispatch(upsertManyBlocks(blocks))

        setExtracting(true)
        await fetchChatCompletion({
          messages: [userMessage],
          assistant: {
            ...assistant,
            prompt: assistantPrompt
          },
          webSearchContent,
          onChunkReceived: (chunk: Chunk) => {
            const progressText = ExtractProgressTextMap[chunk.type]
            console.log('--- chunk', chunk)
            if (progressText) {
              setExtractProgressText(progressText)
            }
            if (chunk.type === ChunkType.TEXT_DELTA) {
              blockContent += chunk.text
            }

            if (chunk.type === ChunkType.TEXT_COMPLETE) {
              setExtracting(false)
              setExtractProgressText('')
              checkResponseText(blockContent)
              // blockId && store.dispatch(updateOneBlock({ id: blockId, changes: { status: MessageBlockStatus.SUCCESS } }))
              // store.dispatch(
              //   newMessagesActions.updateMessage({
              //     topicId,
              //     messageId: assistantMessage.id,
              //     updates: { status: AssistantMessageStatus.SUCCESS }
              //   })
              // )
            }
          }
        })

        // 如果需要展示回复内容，可以手动处理 responseMessage.content
      } catch (error) {
        console.error('Model request failed:', error)
        window.modal.error({
          content: toString(error)
        })
      } finally {
        setExtracting(false)
      }
    },
    [assistant, topic]
  )

  const itemGroups = useMemo(() => {
    if (!isEmpty(structureMetaData)) {
      return structureMetaData.map((object) => {
        if (Array.isArray(object)) {
          return {
            group: null,
            metrics: object
          }
        } else {
          return object
        }
      })
    }
    return []
  }, [structureMetaData])

  const getMetaOptions = () => {
    return (
      <Space>
        {hasTempData && (
          <Tooltip title={t('重新生成该指标')}>
            <Button size="small" type="text" icon={<RefreshCcw size={16} />} />
          </Tooltip>
        )}

        <Tooltip title={t('修改提示词或者生成的内容')}>
          <Button size="small" type="text" icon={<Edit3Icon size={16} />} />
        </Tooltip>
      </Space>
    )
  }

  return (
    <Container $expanded={expanded} $loading={extracting}>
      {extracting && (
        <Mask>
          <SearchingContainer>
            <Search size={24} />
            <SearchingText>{extractProgressText}</SearchingText>
            <BarLoader color="#1677ff" />
          </SearchingContainer>
        </Mask>
      )}
      <Header justify="space-between">
        <div className="title">{attachedTemplate?.name}</div>
        <Space>
          {hasTempData && (
            <>
              <Button size="small" onClick={clearTemplateTempData}>
                {t('清空')}
              </Button>
              <Tooltip title={t('保存当前内容至企业信息图谱')}>
                <Button size="small" type="primary">
                  {t('保存')}
                </Button>
              </Tooltip>
            </>
          )}
          <Tooltip title={t('基于当前信息模板生成内容')}>
            <Button
              size="small"
              type="primary"
              onClick={() =>
                window.modal.confirm({
                  content: t('开始提取信息之前会清空当前话题下所有消息记录，是否继续？'),
                  onOk: () => {
                    EventEmitter.emit(EVENT_NAMES.CLEAR_MESSAGES, {
                      ...topic,
                      noConfirm: true
                    })
                    setTimeout(() => {
                      extractContent(
                        DEFAULT_OPERATION_PROMPT.EXTRACT_CONTENTS.replace('{companyName}', attachedTemplate?.name || '')
                      )
                    }, 500)
                  }
                })
              }>
              {t('生成')}
            </Button>
          </Tooltip>
          <Button
            size="small"
            type="text"
            icon={expanded ? <ChevronsDownUpIcon size={16} /> : <ChevronsUpDownIcon size={16} />}
            onClick={() => setExpanded(!expanded)}
          />
        </Space>
      </Header>
      <MetaContainer vertical gap={8}>
        {map(itemGroups, (data) => {
          const items: CollapseProps['items'] = map(data.metrics, (item, index) => {
            return {
              key: index,
              label: (
                <>
                  <div>
                    <span>{t('[指标]')}</span>
                    &nbsp;
                    {item.name}
                  </div>
                  <div>
                    <span>{t('[提示词]')}</span>
                    &nbsp;
                    {item.prompt}
                  </div>
                </>
              ),
              children: item.value ? <ItemView>{item.value}</ItemView> : null,
              extra: getMetaOptions(),
              showArrow: false
            }
          })

          return (
            <MetaItem>
              <div className="title">{data.group || '其他'}</div>
              <Collapse
                className="collapse"
                items={items}
                expandIconPosition="right"
                size="small"
                collapsible={'icon'}
                activeKey={hasTempData ? map(items, (_, index) => index) : []}
              />
            </MetaItem>
          )
        })}
      </MetaContainer>
    </Container>
  )
}

const Container = styled.div<{ $expanded: boolean; $loading: boolean }>`
  position: relative;
  margin: 12px 20px;
  padding: 0 12px 8px;
  max-height: ${({ $expanded }) => ($expanded ? '300px' : '40px')};
  overflow-y: ${({ $expanded, $loading }) => ($expanded && !$loading ? 'auto' : 'hidden')};
  border-top: 1px solid var(--color-background-mute);
  border-bottom: 1px solid var(--color-background-mute);
  transition: max-height 0.3s ease-in-out;
`

const Mask = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 2;

  display: flex;
  align-items: center;
  justify-content: center;
`

const Header = styled(Flex)`
  position: sticky;
  top: 0;
  padding: 8px 0;
  background-color: var(--color-background);
  width: 100%;
  z-index: 1;

  .title {
    color: var(--color-text-1);
    font-weight: 500;
  }
`

const SearchingContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 10px;
  border-radius: 10px;
  margin-bottom: 10px;
  gap: 10px;
`

const SearchingText = styled.div`
  font-size: 14px;
  line-height: 1.6;
  text-decoration: none;
  color: var(--color-text-1);
`

const MetaContainer = styled(Flex)``

const MetaItem = styled.div`
  color: var(--color-text-2);

  .collapse {
    font-size: 12px;
  }

  .title {
    color: var(--color-text-2);
    font-weight: 500;
    margin-bottom: 4px;
  }
`

const ItemView = styled.div``

export default StructureMeta
