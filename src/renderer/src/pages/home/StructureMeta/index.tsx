import { REFERENCE_DOCUMENT_PROMPT, REFERENCE_TEMPLATE_PROMPT } from '@renderer/config/prompts'
import { useAssistant } from '@renderer/hooks/useAssistant'
import SimpleMarkdown from '@renderer/pages/investment/SimpleMarkdown'
import ManageCompanyDiagramPopup from '@renderer/pages/investment/templates/ManageDiagramPopup'
import { fetchChatCompletion } from '@renderer/services/ApiService'
import { EVENT_NAMES, EventEmitter } from '@renderer/services/EventService'
import { checkRateLimit, getUserMessage } from '@renderer/services/MessagesService'
import store, { useAppDispatch } from '@renderer/store'
import { upsertManyBlocks } from '@renderer/store/messageBlock'
import { sendMessage } from '@renderer/store/thunk/messageThunk'
import type { Assistant, InfoMetric, InfoStructure, Topic, WebSearchProviderResponse } from '@renderer/types'
import { Chunk, ChunkType } from '@renderer/types/chunk'
import { uuid } from '@renderer/utils'
import { Button, Collapse, CollapseProps, Flex, Space, Tooltip } from 'antd'
import { isEmpty, map, throttle, toString } from 'lodash'
import { ChevronsDownUpIcon, ChevronsUpDownIcon, Edit3Icon, RefreshCcw, Search } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BarLoader from 'react-spinners/BarLoader'
import styled from 'styled-components'

import CitationsList from '../Messages/CitationsList'
import Editable from './components/Editable'
class OperationPrompt {
  private companyName: string

  constructor(companyName: string) {
    this.companyName = companyName
  }

  get EXTRACT_CONTENTS(): string {
    return `基于参考资料和网络查询数据，严格生成符合信息模板的${this.companyName}企业信息。
Constrains:
1. 输出必须为纯JSON对象
2. 禁止包含任何解释性文字、前缀说明
3. 确保JSON语法正确且可被解析`
  }

  getExtractMetricText(name: string, prompt: string): string {
    return `基于参考资料和网络查询数据：
Definition:
指标名：${name}
指标提示词：${prompt}
Goals:
1. 分析${this.companyName}企业相关数据
2. 根据 Definition 中的提示词，生成${this.companyName}的${name}
3. 使用Markdown格式呈现结果
OutputFormat:
- 使用合适的Markdown格式（标题、列表、表格等）
- 不包含任何解释性文字
- 保持内容的商业专业和客观性，内容语法中不要出现新闻宣传类的字眼
- 如果内容生成需要计算分析，给出完整的数据以及计算分析过程`
  }
}

const getResultContent = (content: string | object) => {
  if (content && typeof content === 'object') {
    return toString(content)
  }
  return content
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
  const dispatch = useAppDispatch()
  const containerRef = useRef<HTMLDivElement>(null)
  const { assistant: currentAssistant, updateAssistant } = useAssistant(assistant.id)
  const { attachedTemplate, attachedDocument, prompt } = currentAssistant

  const [expanded, setExpanded] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [extractProgressText, setExtractProgressText] = useState('')
  const [hasTempData, setHasTempData] = useState(false)
  const [editingMetric, setEditingMetric] = useState<InfoMetric | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [webSearchResult, setWebSearchResult] = useState<WebSearchProviderResponse>()

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleMouseMove = throttle((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    requestAnimationFrame(() => {
      const newHeight = Math.max(expanded ? 240 : 40, e.clientY)
      containerRef.current!.style.height = `${newHeight}px`
    })
  }, 50)

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'ns-resize'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    } else {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const operationPrompt = useMemo(() => {
    return new OperationPrompt(attachedTemplate?.name || '')
  }, [attachedTemplate?.name])

  const structureMetaData: InfoStructure = useMemo(() => {
    const data = attachedTemplate?.tempData
      ? attachedTemplate.tempData
      : getStructureMetaDataSource(attachedTemplate?.structure)
    return map(data, (group) => {
      return {
        ...group,
        metrics: map(group.metrics, (metric) => {
          return {
            ...metric,
            id: uuid()
          }
        })
      }
    })
  }, [attachedTemplate])

  useEffect(() => {
    if (!isEmpty(attachedTemplate?.tempData)) {
      setHasTempData(true)
    } else {
      setHasTempData(false)
    }
  }, [attachedTemplate?.tempData])

  const updateMetricField = useCallback(
    (groupIndex: number, metricIndex: number) => {
      try {
        // 创建结构副本
        const updatedStructure = [...structureMetaData]

        // 更新指定字段
        updatedStructure[groupIndex].metrics[metricIndex] = {
          ...updatedStructure[groupIndex].metrics[metricIndex],
          ...editingMetric
        }

        // 更新到 attachedTemplate
        if (attachedTemplate) {
          // 转换为 JSON 字符串
          const structureJson = JSON.stringify(updatedStructure, null, 2)
          updateAssistant({
            ...currentAssistant,
            attachedTemplate: attachedTemplate.tempData
              ? {
                  ...attachedTemplate,
                  tempData: updatedStructure
                }
              : {
                  ...attachedTemplate,
                  structure: structureJson
                }
          })
        }
      } catch (error) {
        console.error('Failed to update metric field:', error)
        window.modal.error({
          content: t('指标字段更新失败')
        })
      }
    },
    [structureMetaData, editingMetric, attachedTemplate, updateAssistant, currentAssistant, t]
  )

  const onChangeEditingMetric = useCallback(
    (field: keyof InfoMetric, value: string) => {
      if (editingMetric) {
        setEditingMetric({
          ...editingMetric,
          [field]: value
        })
      }
    },
    [editingMetric]
  )

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
      if (Array.isArray(object) && object.length === structureMetaData.length) {
        const response = object as InfoStructure
        const tempData = map(structureMetaData, (item, index) => {
          const newMetrics = map(item.metrics, (metric, i) => {
            const responseMetric = response[index]?.metrics[i]
            if (metric.name === responseMetric?.name) {
              return {
                ...metric,
                ...responseMetric
              }
            }
            return metric
          })
          return {
            ...item,
            metrics: newMetrics
          }
        })
        if (attachedTemplate) {
          updateAssistant({
            ...currentAssistant,
            attachedTemplate: {
              ...attachedTemplate,
              tempData
            }
          })
        }
      } else {
        throw new Error('返回格式校验错误')
      }
    } catch (error) {
      console.error(error)
      window.modal.error({
        content: (
          <div>
            {t('模型返回格式解析错误，内容为')}
            <code>{text}</code>
          </div>
        )
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

  const saveTempToCompanyDiagram = () => {
    if (attachedTemplate?.tempData) {
      let structure = ''
      try {
        structure = JSON.stringify(attachedTemplate.tempData)
      } catch (error) {
        window.message.error({
          content: t('模板数据解析错误')
        })
        return
      }
      ManageCompanyDiagramPopup.show({
        name: attachedTemplate.name,
        structure,
        description: ''
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
            if (progressText) {
              setExtractProgressText(progressText)
            }
            if (chunk.type === ChunkType.EXTERNEL_TOOL_COMPLETE) {
              setWebSearchResult(chunk.external_tool.webSearch?.results as WebSearchProviderResponse)
            }
            if (chunk.type === ChunkType.TEXT_DELTA) {
              blockContent += chunk.text
            } else {
              console.log('--- chunk', chunk)
            }

            if (chunk.type === ChunkType.TEXT_COMPLETE) {
              setExtracting(false)
              setExtractProgressText('')
              checkResponseText(blockContent)
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
    [assistant, attachedDocument, attachedTemplate?.structure, prompt, topic]
  )

  const extractMetricContent = useCallback(
    async (metric: InfoMetric) => {
      if (checkRateLimit(assistant)) {
        return
      }

      let assistantPrompt = prompt
      if (!isEmpty(topic.attachedPages)) {
        const pageContent =
          topic.attachedPages?.reduce((acc, page) => acc + `\r\nIndex${page.index}: ${page.content}`, '') || ''
        const pagePrompt = REFERENCE_DOCUMENT_PROMPT.replace('{document_content}', pageContent)
        assistantPrompt = prompt ? `${prompt}\n${pagePrompt}` : pagePrompt
      }
      const text = operationPrompt.getExtractMetricText(metric.name, metric.prompt)
      // reference file
      const files = attachedDocument && !attachedDocument.disabled ? [attachedDocument] : []
      const { message: userMessage, blocks } = getUserMessage({
        assistant,
        topic,
        content: text,
        files
      })

      await dispatch(
        sendMessage(
          userMessage,
          blocks,
          {
            ...assistant,
            prompt: assistantPrompt
          },
          assistant.topics[0].id
        )
      )
    },
    [assistant, attachedDocument, operationPrompt, topic]
  )

  const citations = useMemo(() => {
    if (
      (currentAssistant.enableWebSearch || currentAssistant.webSearchProviderId) &&
      Array.isArray(webSearchResult?.results)
    ) {
      return map(webSearchResult?.results, (item, index) => ({
        ...item,
        number: index,
        showFavicon: true
      }))
    }
    return []
  }, [webSearchResult, currentAssistant.enableWebSearch, currentAssistant.webSearchProviderId])

  const onEditMetric = (metric: InfoMetric, groupId: number, metricIndex: number) => {
    if (editingMetric && editingMetric.id === metric.id) {
      updateMetricField(groupId, metricIndex)
      setEditingMetric(null)
      return
    }
    setEditingMetric(metric)
  }

  const onGenMetricContent = (metric: InfoMetric) => {
    extractMetricContent(metric)
  }

  const getMetaOptions = (metric: InfoMetric, groupId: number, metricIndex: number) => {
    return (
      <Space>
        {hasTempData && (
          <Tooltip title={t('重新生成该指标')}>
            <Button
              size="small"
              type="text"
              icon={<RefreshCcw size={16} onClick={() => onGenMetricContent(metric)} />}
            />
          </Tooltip>
        )}

        <Tooltip title={t('修改提示词或者生成的内容')}>
          <Button
            size="small"
            type="text"
            icon={<Edit3Icon size={16} />}
            onClick={() => onEditMetric(metric, groupId, metricIndex)}
          />
        </Tooltip>
      </Space>
    )
  }

  // console.log('--- web search provider', webSearchResult, citations)

  return (
    <Container ref={containerRef} $expanded={expanded} $loading={extracting}>
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
        <Space className="title">
          {attachedTemplate?.name}
          {!isEmpty(citations) && <CitationsList citations={citations} />}
        </Space>
        <Space>
          {hasTempData && (
            <>
              <Button size="small" onClick={clearTemplateTempData}>
                {t('清空')}
              </Button>
              <Tooltip title={t('保存当前内容至企业信息图谱')}>
                <Button size="small" type="primary" onClick={saveTempToCompanyDiagram}>
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
                      extractContent(operationPrompt.EXTRACT_CONTENTS)
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
        {map(structureMetaData, (data, groupIndex) => {
          const items: CollapseProps['items'] = map(data.metrics, (item, index) => {
            const isEditable = editingMetric?.id === item.id
            const renderData = isEditable ? (editingMetric as InfoMetric) : item

            const resultContent = getResultContent(renderData.content as any)

            return {
              key: index,
              label: (
                <>
                  <Editable
                    editable={isEditable}
                    text={renderData.name}
                    onChange={(value) => onChangeEditingMetric('name', value)}
                    onPressEnter={() => updateMetricField(groupIndex, index)}>
                    <span>{t('[指标]')}</span>
                    &nbsp;
                    {renderData.name}
                  </Editable>
                  {/* {renderData.description && (
                    <Editable
                      editable={isEditable}
                      text={renderData.description}
                      onChange={(value) => onChangeEditingMetric('description', value)}
                      onPressEnter={() => updateMetricField(groupIndex, index)}>
                      <span>{t('[指标介绍]')}</span>
                      &nbsp;
                      {renderData.description}
                    </Editable>
                  )} */}
                  <Editable
                    editable={isEditable}
                    text={renderData.prompt}
                    onChange={(value) => onChangeEditingMetric('prompt', value)}
                    onPressEnter={() => updateMetricField(groupIndex, index)}>
                    <span>{t('[提示词]')}</span>
                    &nbsp;
                    {renderData.prompt}
                  </Editable>
                </>
              ),
              children: (
                <Editable
                  editable={isEditable}
                  textarea
                  text={renderData.content || ''}
                  onChange={(value) => onChangeEditingMetric('content', value)}
                  onPressEnter={() => updateMetricField(groupIndex, index)}>
                  <SimpleMarkdown>{resultContent}</SimpleMarkdown>
                </Editable>
              ),
              extra: getMetaOptions(item, groupIndex, index),
              showArrow: false
            }
          })

          return (
            <MetaItem>
              <div className="title">{data.group}</div>
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
      {expanded && <DragHandle onMouseDown={handleMouseDown} />}
    </Container>
  )
}

const Container = styled.div<{ $expanded: boolean; $loading: boolean }>`
  position: sticky;
  top: 0;
  background-color: var(--color-background);
  margin: 12px 0;
  padding: 0 20px 8px;
  height: 240px;
  max-height: ${({ $expanded }) => ($expanded ? 'fit-content' : '40px')};
  overflow-y: ${({ $expanded, $loading }) => ($expanded && !$loading ? 'auto' : 'hidden')};
  border-top: 1px solid var(--color-background-mute);
  border-bottom: 1px solid var(--color-background-mute);
  box-shadow: 0 4px 8px -4px var(--color-background-mute);
  transition: max-height 0.3s ease-in-out;
  will-change: height;
  transform: translateZ(0);
`

const DragHandle = styled.div`
  position: sticky;
  bottom: -8px;
  left: 0;
  width: 100%;
  height: 4px;
  background-color: var(--color-primary);
  cursor: ns-resize;
  opacity: 0.8;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
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

    .ant-collapse-header {
      background-color: var(--color-background-soft);
    }
  }

  .title {
    color: var(--color-text-2);
    font-weight: 500;
    margin-bottom: 4px;
  }
`

export default StructureMeta
