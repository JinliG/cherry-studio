import { TopView } from '@renderer/components/TopView'
import { useCompanyTemplate, useCompanyTemplates } from '@renderer/hooks/useCompanyTemplates'
import { CompanyTemplate } from '@renderer/types'
import { uuid } from '@renderer/utils'
import { Form, FormInstance, Input, Modal } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { JsonData, JsonEditor } from 'json-edit-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  resolve: (data: CompanyTemplate | null) => void
  id?: string
}

type FieldType = {
  name: string
  structure: string
  description?: string
}

const PopupContainer: React.FC<Props> = ({ resolve, id }) => {
  const isEditing = !!id
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const { addCompanyTemplate } = useCompanyTemplates()
  const { template: current, updateCompanyTemplate } = useCompanyTemplate(id || '')
  const formRef = useRef<FormInstance>(null)

  const [open, setOpen] = useState(true)
  const [jsonData, setJsonData] = useState({})

  const onFinish = (values: FieldType) => {
    if (values.name.trim() === '' || values.structure.trim() === '') {
      return
    }

    const payload: CompanyTemplate = isEditing
      ? {
          ...current,
          ...values
        }
      : {
          id: uuid(),
          ...values
        }

    if (isEditing) {
      updateCompanyTemplate(payload)
    } else {
      addCompanyTemplate(payload)
    }

    resolve(payload)
    setOpen(false)
  }

  const onCancel = () => {
    setOpen(false)
  }

  const onClose = () => {
    resolve(null)
  }

  const onSetJsonData = (data: JsonData) => {
    setJsonData(data)
    try {
      form.setFieldValue('structure', JSON.stringify(data))
    } catch (error) {
      console.error('--- ', error)
    }
  }

  useEffect(() => {
    if (isEditing) {
      let jsonData = {}
      try {
        jsonData = JSON.parse(current?.structure)
      } catch (error) {
        console.error('--- ', error)
      }
      setJsonData(jsonData)
    }
  }, [isEditing, current?.structure])

  return (
    <Modal
      title={t('company_template.template.title')}
      open={open}
      onOk={() => formRef.current?.submit()}
      onCancel={onCancel}
      maskClosable={false}
      afterClose={onClose}
      okText={t('company_template.submit')}
      styles={{
        body: {
          maxHeight: '65vh',
          overflowY: 'auto'
        }
      }}
      centered>
      <Form
        ref={formRef}
        form={form}
        layout="vertical"
        colon={false}
        style={{ marginTop: 25 }}
        onFinish={onFinish}
        initialValues={isEditing ? current : {}}>
        <Form.Item name="name" label={t('company_template.add.name')} rules={[{ required: true }]}>
          <Input placeholder={t('company_template.add.name_placeholder')} spellCheck={false} allowClear />
        </Form.Item>
        <Form.Item
          name="structure"
          label={t('company_template.add.structure')}
          rules={[{ required: true }]}
          style={{ position: 'relative' }}>
          <JsonEditor data={jsonData} setData={onSetJsonData} />
        </Form.Item>
        <Form.Item name="prompt" label={t('company_template.add.desc')} style={{ position: 'relative' }}>
          <TextArea placeholder={t('company_template.add.desc_placeholder')} spellCheck={false} rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default class ManageCompanyTemplatePopup {
  static topviewId = 0
  static hide() {
    TopView.hide('ManageCompanyTemplatePopup')
  }
  static show() {
    return new Promise<CompanyTemplate | null>((resolve) => {
      TopView.show(
        <PopupContainer
          resolve={(v) => {
            resolve(v)
            this.hide()
          }}
        />,
        'ManageCompanyTemplatePopup'
      )
    })
  }

  static edit(id: string) {
    return new Promise<CompanyTemplate | null>((resolve) => {
      TopView.show(
        <PopupContainer
          id={id}
          resolve={(v) => {
            resolve(v)
            this.hide()
          }}
        />,
        'ManageCompanyTemplatePopup'
      )
    })
  }
}
