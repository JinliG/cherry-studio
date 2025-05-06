import { CheckOutlined, DeleteOutlined, EditOutlined, SnippetsOutlined } from '@ant-design/icons'
import { Box } from '@renderer/components/Layout'
import FileManager from '@renderer/services/FileManager'
import { useAppSelector } from '@renderer/store'
import { Assistant, AssistantSettings } from '@renderer/types'
import { formatFileSize } from '@renderer/utils'
import { Button, Select, SelectProps, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface Props {
  assistant: Assistant
  updateAssistant: (assistant: Assistant) => void
  updateAssistantSettings: (settings: AssistantSettings) => void
}

const AssistantDocumentSettings: React.FC<Props> = ({ assistant, updateAssistant }) => {
  const { t } = useTranslation()

  const companyTemplateState = useAppSelector((state) => state.company_templates)
  const templateOptions: SelectProps['options'] = companyTemplateState.templates.map((tem) => ({
    label: tem.name,
    value: tem.id
  }))

  const onUpdate = (value) => {
    const template = companyTemplateState.templates.find((t) => t.id === value)
    const _assistant: Assistant = { ...assistant, companyTemplate: template }
    updateAssistant(_assistant)
  }

  const onSelectFile = async () => {
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
    }
  }

  const { origin_name } = assistant.attachedDocument || {}

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
              <Button type="text" icon={<EditOutlined />} onClick={onSelectFile} />
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
          <Button icon={<SnippetsOutlined />} onClick={onSelectFile}>
            {t('点击选择')}
          </Button>
        )}
      </Row>
      <Row>
        <Box mb={8} style={{ fontWeight: 'bold' }}>
          {t('企业信息模板')}
        </Box>
        <Select
          allowClear
          value={assistant.companyTemplate?.id}
          placeholder={t('选择企业信息模板')}
          menuItemSelectedIcon={<CheckOutlined />}
          options={templateOptions}
          onChange={(value) => onUpdate(value)}
          onClear={() => {
            updateAssistant({ ...assistant, companyTemplate: undefined })
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

export default AssistantDocumentSettings
