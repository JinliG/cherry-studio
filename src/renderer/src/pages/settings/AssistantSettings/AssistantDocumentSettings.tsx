import { CheckOutlined, DeleteOutlined, DiffOutlined, SnippetsOutlined, UploadOutlined } from '@ant-design/icons'
import { Box } from '@renderer/components/Layout'
import db from '@renderer/databases'
import { useShowAssistants } from '@renderer/hooks/useStore'
import FileManager from '@renderer/services/FileManager'
import { useAppSelector } from '@renderer/store'
import { Assistant, AssistantSettings, FileType } from '@renderer/types'
import { formatFileSize } from '@renderer/utils'
import { Button, List, Popover, Select, SelectProps, Space, Tooltip } from 'antd'
import { useLiveQuery } from 'dexie-react-hooks'
import { noop } from 'lodash'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface Props {
  assistant: Assistant
  updateAssistant: (assistant: Assistant) => void
  updateAssistantSettings: (settings: AssistantSettings) => void
}

const AssistantDocumentSettings: React.FC<Props> = ({ assistant, updateAssistant }) => {
  const { t } = useTranslation()
  const { setShowAssistants } = useShowAssistants()
  const files = useLiveQuery<FileType[]>(() => {
    return db.files.orderBy('count').toArray()
  }, [])
  const companyTemplateState = useAppSelector((state) => state.company_templates)
  const templateOptions: SelectProps['options'] = companyTemplateState.templates.map((tem) => ({
    label: tem.name,
    value: tem.id
  }))

  const onUpdate = (value) => {
    const template = companyTemplateState.templates.find((t) => t.id === value)
    const _assistant: Assistant = { ...assistant, attachedTemplate: template }
    updateAssistant(_assistant)
  }

  const onUploadFile = async () => {
    const _files = await window.api.file.select({
      properties: ['openFile'],
      filters: [
        {
          name: 'Files',
          // pdf only, for now
          extensions: ['pdf']
        }
      ]
    })

    if (Array.isArray(_files) && _files[0]) {
      const files = await FileManager.uploadFiles(_files)
      updateAssistant({ ...assistant, attachedDocument: files[0] })
      setShowAssistants(false)
    }
  }

  const onSelectFile = (file: FileType) => {
    window.modal.confirm({
      centered: true,
      content: t('确认关联该文档吗？'),
      onOk: () => {
        updateAssistant({ ...assistant, attachedDocument: file })
        setShowAssistants(false)
      }
    })
  }

  const { origin_name, id } = assistant.attachedDocument || {}
  const renderFileList = useCallback(() => {
    console.log('--- files', files)

    return (
      <OverContainer>
        <List
          dataSource={files}
          size="small"
          split={false}
          renderItem={(file, index) => {
            const isCurrent = id === file.id
            return (
              <ListItem $selected={isCurrent} key={index} onClick={isCurrent ? noop : () => onSelectFile(file)}>
                <List.Item.Meta className="item-meta" title={<div className="item-title">{file.origin_name}</div>} />
              </ListItem>
            )
          }}
        />
      </OverContainer>
    )
  }, [files, id])

  return (
    <Container>
      <Row>
        <Box mb={8} style={{ fontWeight: 'bold' }}>
          {t('关联文档')}
        </Box>
        {assistant.attachedDocument ? (
          <>
            <Space size={4}>
              <span
                style={{
                  marginRight: 16
                }}>{`${origin_name} / ${formatFileSize(assistant.attachedDocument.size)}`}</span>
              <Tooltip title={t('重新上传')}>
                <Button type="text" icon={<UploadOutlined />} onClick={onUploadFile} />
              </Tooltip>
              <Popover
                arrow={false}
                trigger={['click']}
                content={renderFileList()}
                placement="bottomRight"
                destroyTooltipOnHide>
                <Tooltip title={t('从资料库选择')}>
                  <Button type="text" icon={<DiffOutlined />} />
                </Tooltip>
              </Popover>
              <Button
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => {
                  updateAssistant({ ...assistant, attachedDocument: undefined })
                }}
              />
            </Space>
          </>
        ) : (
          <Space>
            <Button icon={<SnippetsOutlined />} onClick={onUploadFile}>
              {t('点击上传')}
            </Button>
            <Popover
              arrow={false}
              trigger={['click']}
              content={renderFileList()}
              placement="bottomRight"
              destroyTooltipOnHide>
              <Button>{t('从资料库选择')}</Button>
            </Popover>
          </Space>
        )}
      </Row>
      <Row>
        <Box mb={8} style={{ fontWeight: 'bold' }}>
          {t('企业信息模板')}
        </Box>
        <Select
          allowClear
          value={assistant.attachedTemplate?.id}
          placeholder={t('选择企业信息模板')}
          menuItemSelectedIcon={<CheckOutlined />}
          options={templateOptions}
          onChange={(value) => onUpdate(value)}
          onClear={() => {
            updateAssistant({ ...assistant, attachedTemplate: undefined })
          }}
          filterOption={(input, option) =>
            String(option?.label ?? '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
        />
      </Row>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  padding: 5px;
`

const Row = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
`

const OverContainer = styled.div`
  height: auto;
  width: 200px;

  .title {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-text-2);
    margin-bottom: 12px;
  }
`

const ListItem = styled(List.Item)<{ $selected: boolean }>`
  background-color: ${(props) => (props.$selected ? 'var(--color-primary-mute)' : '')};
  cursor: pointer;
  margin-bottom: 8px;
  border-radius: 8px;
  opacity: 0.8;

  &:hover {
    background-color: var(--color-primary-mute);
  }

  .item-meta {
  }

  .item-title {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
`

export default AssistantDocumentSettings
