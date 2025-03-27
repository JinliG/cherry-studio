import { CheckOutlined, ClusterOutlined } from '@ant-design/icons'
import { useAssistant } from '@renderer/hooks/useAssistant'
import { useAppSelector } from '@renderer/store'
import { Assistant, CompanyTemplate } from '@renderer/types'
import { Popover, Select, SelectProps, Tooltip } from 'antd'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface Props {
  assistant: Assistant
  disabled?: boolean
  ToolbarButton?: any
}

const CompanyTemplateSelector: FC<Props> = ({ assistant }) => {
  const { t } = useTranslation()
  const { assistant: currentAssistant, updateAssistant } = useAssistant(assistant.id)
  const companyTemplateState = useAppSelector((state) => state.company_templates)
  const templateOptions: SelectProps['options'] = companyTemplateState.templates.map((base) => ({
    label: base.name,
    value: base.id
  }))

  const onSelect = (selected: CompanyTemplate) => {
    updateAssistant({
      ...currentAssistant,
      companyTemplate: selected
    })
  }

  return (
    <SelectorContainer>
      {companyTemplateState.templates.length === 0 ? (
        <EmptyMessage>{t('暂无企业信息模板')}</EmptyMessage>
      ) : (
        <Select
          value={currentAssistant.companyTemplate?.id}
          allowClear
          placeholder={t('请选择择企业信息模板')}
          menuItemSelectedIcon={<CheckOutlined />}
          options={templateOptions}
          filterOption={(input, option) =>
            String(option?.label ?? '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          onChange={(id) => {
            const newSelected = companyTemplateState.templates.find((t) => id === t.id)
            newSelected && onSelect(newSelected)
          }}
          onClear={() => {
            updateAssistant({ ...assistant, companyTemplate: undefined })
          }}
          style={{ width: '200px' }}
        />
      )}
    </SelectorContainer>
  )
}

const CompanyTemplateButton: FC<Props> = ({ assistant, disabled, ToolbarButton }) => {
  const { t } = useTranslation()

  return (
    <Tooltip placement="top" title={t('企业信息模板')} arrow>
      <Popover
        placement="top"
        content={<CompanyTemplateSelector assistant={assistant} />}
        overlayStyle={{ maxWidth: 400 }}
        trigger="click">
        <ToolbarButton type="text" disabled={disabled}>
          <ClusterOutlined style={{ color: assistant.companyTemplate ? 'var(--color-link)' : 'var(--color-icon)' }} />
        </ToolbarButton>
      </Popover>
    </Tooltip>
  )
}

const SelectorContainer = styled.div`
  max-height: 300px;
  overflow-y: auto;
`

const EmptyMessage = styled.div`
  padding: 8px;
`

export default CompanyTemplateButton
