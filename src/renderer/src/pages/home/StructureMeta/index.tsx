import { REFERENCE_DOCUMENT_PROMPT, REFERENCE_TEMPLATE_PROMPT } from '@renderer/config/prompts'
import { fetchChatCompletion } from '@renderer/services/ApiService'
import { EVENT_NAMES, EventEmitter } from '@renderer/services/EventService'
import { checkRateLimit, getAssistantMessage, getUserMessage } from '@renderer/services/MessagesService'
import { estimateMessageUsage } from '@renderer/services/TokenService'
import type { Assistant, InfoMetric, InfoStructure, Message, Topic } from '@renderer/types'
import { Button, Collapse, CollapseProps, Flex, Space } from 'antd'
import { forEach, isEmpty, map } from 'lodash'
import { ChevronsDownUpIcon, ChevronsUpDownIcon, Edit3Icon, Search } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BarLoader from 'react-spinners/BarLoader'
import styled from 'styled-components'

const DEFAULT_OPERATION_PROMPT = {
  EXTRACT_CONTENTS: '根据上下文和网络查询数据，基于信息模板生成内容，返回格式必须为合法 json 且不包含多余内容。',
  REGEN_METRIC_VALUE: '根据新的提示词和上下文，生成该指标值'
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

interface _Props {
  assistant: Assistant
  topic: Topic
}
const StructureMeta: React.FC<_Props> = ({ assistant, topic }) => {
  const { t } = useTranslation()
  // const dispatch = useAppDispatch()

  const [expanded, setExpanded] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [lastStreamMessage, setLastStreamMessage] = useState<Message>()
  const [contentSource, setContentSource] = useState('')

  const structureMetaData: InfoStructure = useMemo(
    () => getStructureMetaDataSource(assistant.attachedTemplate?.structure),
    [assistant.attachedTemplate]
  )

  const allMetrics = useMemo(() => {
    if (!isEmpty(structureMetaData)) {
      let list: InfoMetric[] = []
      forEach(structureMetaData, (object) => {
        if (Array.isArray(object)) {
          list = list.concat(object)
        } else {
          list = list.concat(object.metrics)
        }
      })

      return list
    }
    return []
  }, [structureMetaData]) as InfoMetric[]

  const getWebSearchContent = (metric?: InfoMetric) => {
    const entityName = assistant.attachedTemplate?.name
    if (metric) {
      return `${entityName} ${metric.name} ${metric.prompt}`
    } else {
      return `${entityName} 企业基本信息`
    }
  }

  const extractContent = useCallback(
    async (text: string) => {
      if (checkRateLimit(assistant)) {
        return
      }

      EventEmitter.emit(EVENT_NAMES.SEND_MESSAGE)

      try {
        // Dispatch the sendMessage action with all options
        const userMessage = getUserMessage({
          assistant,
          topic,
          type: 'text',
          content: text
        })

        // reference file
        if (assistant.attachedDocument && !assistant.attachedDocument.disabled) {
          userMessage.files = [...(userMessage.files || []), assistant.attachedDocument]
        }

        let assistantPrompt = assistant.prompt
        if (!isEmpty(topic.attachedPages)) {
          const pageContent =
            topic.attachedPages?.reduce((acc, page) => acc + `\r\nIndex${page.index}: ${page.content}`, '') || ''
          const pagePrompt = REFERENCE_DOCUMENT_PROMPT.replace('{document_content}', pageContent)

          assistantPrompt = assistant.prompt ? `${assistant.prompt}\n${pagePrompt}` : pagePrompt
        }

        const templatePrompt = REFERENCE_TEMPLATE_PROMPT.replace(
          '{company_template}',
          assistant.attachedTemplate?.structure || ''
        )
        assistantPrompt = assistant.prompt ? `${assistant.prompt}\n${templatePrompt}` : templatePrompt
        userMessage.usage = await estimateMessageUsage(userMessage)

        const webSearchContent = getWebSearchContent()

        try {
          setExtracting(true)
          const responseMessage = await fetchChatCompletion({
            message: {
              ...getAssistantMessage({ assistant, topic }),
              askId: userMessage.id,
              status: 'sending'
            },
            messages: [userMessage],
            assistant: {
              ...assistant,
              prompt: assistantPrompt
            },
            webSearchContent,
            onResponse: async (msg) => {
              const updateMessage = { ...msg, status: msg.status || 'pending', content: msg.content || '' }
              setLastStreamMessage(updateMessage)
            }
          })

          // 处理 responseMessage，例如更新 UI 或保存结果
          console.log('Model response:', responseMessage)

          // 如果需要展示回复内容，可以手动处理 responseMessage.content
        } catch (error) {
          console.error('Model request failed:', error)
        } finally {
          setExtracting(false)
        }

        // dispatch(
        //   sendMessage(
        //     userMessage,
        //     {
        //       ...assistant,
        //       prompt: assistantPrompt
        //     },
        //     topic,
        //     {
        //       webSearchContent
        //     }
        //   )
        // )
      } catch (error) {
        console.error('Failed to send message:', error)
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
        <Button size="small" type="text" icon={<Edit3Icon size={16} />} />
      </Space>
    )
  }

  return (
    <Container $expanded={expanded} $loading={extracting}>
      {extracting && (
        <Mask>
          <SearchingContainer>
            <Search size={24} />
            <SearchingText>{t('message.searching')}</SearchingText>
            <BarLoader color="#1677ff" />
          </SearchingContainer>
        </Mask>
      )}
      <Header justify="space-between">
        <div className="title">{assistant.attachedTemplate?.name}</div>
        <Space>
          <Button size="small" type="primary" onClick={() => extractContent(DEFAULT_OPERATION_PROMPT.EXTRACT_CONTENTS)}>
            {t('structure_meta.extract')}
          </Button>
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
              showArrow: !!item.value
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
    color: var(--color-text-1);
    font-weight: 500;
    margin-bottom: 4px;
  }
`

const ItemView = styled.div``

export default StructureMeta
