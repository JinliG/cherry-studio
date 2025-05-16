import { TopView } from '@renderer/components/TopView'
import { useCompanyDiagram, useCompanyDiagrams } from '@renderer/hooks/useCompanyTemplates'
import { CompanyDiagram, InfoMetric, InfoStructure } from '@renderer/types'
import { uuid } from '@renderer/utils'
import { Button, Flex, Form, FormInstance, Input, Modal, Switch } from 'antd'
import { Descriptions } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import html2canvas from 'html2canvas-pro'
import { JsonData, JsonEditor } from 'json-edit-react'
import { map } from 'lodash'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import SimpleMarkdown from '../SimpleMarkdown'

interface Props {
  resolve: (data: CompanyDiagram | null) => void
  id?: string
}

type FieldType = {
  name: string
  structure: string
  description: string
}

const PopupContainer: React.FC<Props> = ({ resolve, id }) => {
  const isEditing = !!id
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const { addCompanyDiagram } = useCompanyDiagrams()
  const { diagram: current, updateCompanyDiagram } = useCompanyDiagram(id || '')
  const formRef = useRef<FormInstance>(null)

  const [open, setOpen] = useState(true)
  // const [jsonData, setJsonData] = useState({})
  const [infoStructure, setInfoStructure] = useState<InfoStructure>([])
  const [isPreview, setIsPreview] = useState(false) // 新增状态来控制预览模式

  const onFinish = (values: FieldType) => {
    if (values.name.trim() === '' || values.structure.trim() === '') {
      return
    }

    const payload: CompanyDiagram = isEditing
      ? {
          ...current,
          ...values
        }
      : {
          id: uuid(),
          ...values
        }

    if (isEditing) {
      updateCompanyDiagram(payload)
    } else {
      addCompanyDiagram(payload)
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
    setInfoStructure(data as InfoStructure)
    try {
      form.setFieldValue('structure', JSON.stringify(data))
    } catch (error) {
      console.error(error)
    }
  }

  const onTogglePreview = (checked: boolean) => {
    setIsPreview(checked)
  }

  useEffect(() => {
    let jsonData = []
    try {
      jsonData = JSON.parse(current?.structure)
    } catch (error) {
      console.error(error)
    }
    setInfoStructure(jsonData)
  }, [isEditing, current?.structure])

  return (
    <Modal
      title={t('company_template.add.title')}
      open={open}
      onOk={() => formRef.current?.submit()}
      onCancel={onCancel}
      maskClosable={false}
      afterClose={onClose}
      okText={t('company_template.add.title')}
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
          <div>
            <Switch
              style={{ marginBottom: 12 }}
              checked={isPreview}
              onChange={onTogglePreview}
              checkedChildren={t('切换编辑')}
              unCheckedChildren={t('切换预览')}
            />
            {isPreview ? (
              <Descriptions column={1} size="small">
                {map(infoStructure, (item, index) => {
                  let groupName = ''
                  let list: InfoMetric[] = []
                  if (Array.isArray(item)) {
                    groupName = '其他'
                    list = item
                  } else {
                    groupName = item.group
                    list = item.metrics
                  }

                  return (
                    <Descriptions.Item key={index}>
                      <Descriptions
                        styles={{
                          header: {
                            marginBottom: 8
                          }
                        }}
                        title={groupName}
                        bordered
                        column={2}>
                        {list.map((field, index) => (
                          <Descriptions.Item key={index} label={field.name}>
                            <SimpleMarkdown>{field.value as any}</SimpleMarkdown>
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                    </Descriptions.Item>
                  )
                })}
              </Descriptions>
            ) : (
              <JsonEditor data={infoStructure} setData={onSetJsonData} />
            )}
          </div>
        </Form.Item>
        <Form.Item name="prompt" label={t('company_template.add.desc')} style={{ position: 'relative' }}>
          <TextArea placeholder={t('company_template.add.desc_placeholder')} spellCheck={false} rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

const PreviewContainer: React.FC<Props> = ({ resolve, id = '' }) => {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const { diagram: current } = useCompanyDiagram(id)
  const formRef = useRef<FormInstance>(null)

  const [open, setOpen] = useState(true)
  const [infoStructure, setInfoStructure] = useState<InfoStructure>([])

  const onCancel = () => {
    setOpen(false)
  }

  const onClose = () => {
    resolve(null)
  }

  useEffect(() => {
    let jsonData = []
    try {
      jsonData = JSON.parse(current?.structure)
    } catch (error) {
      console.error(error)
    }
    setInfoStructure(jsonData)
  }, [current?.structure])

  const onCaptureScreen = () => {
    if (containerRef.current) {
      html2canvas(containerRef.current).then((canvas) => {
        const imgData = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = imgData
        link.download = 'description.png'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
    }
  }

  return (
    <Modal
      title={t('company_template.diagram.title')}
      open={open}
      onOk={() => formRef.current?.submit()}
      onCancel={onCancel}
      maskClosable={false}
      afterClose={onClose}
      width={800}
      okText={t('company_template.submit')}
      styles={{
        body: {
          maxHeight: '65vh',
          overflowY: 'auto'
        }
      }}
      centered>
      <Flex
        justify="flex-end"
        style={{
          marginRight: 16
        }}>
        <Button onClick={onCaptureScreen}>{t('下载')}</Button>
      </Flex>
      <div ref={containerRef}>
        <Descriptions column={1} size="small">
          {map(infoStructure, (item, index) => {
            let groupName = ''
            let list: InfoMetric[] = []
            if (Array.isArray(item)) {
              groupName = '其他'
              list = item
            } else {
              groupName = item.group
              list = item.metrics
            }

            return (
              <Descriptions.Item key={index}>
                <Descriptions
                  styles={{
                    header: {
                      marginBottom: 8
                    }
                  }}
                  title={groupName}
                  bordered
                  column={2}>
                  {list.map((field, index) => (
                    <Descriptions.Item key={index} label={field.name}>
                      <SimpleMarkdown>{field.value as any}</SimpleMarkdown>
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </Descriptions.Item>
            )
          })}
        </Descriptions>
      </div>
    </Modal>
  )
}

export default class ManageCompanyDiagramPopup {
  static topviewId = 0
  static hide() {
    TopView.hide('ManageCompanyDiagramPopup')
  }
  static show() {
    return new Promise<CompanyDiagram | null>((resolve) => {
      TopView.show(
        <PopupContainer
          resolve={(v) => {
            resolve(v)
            this.hide()
          }}
        />,
        'ManageCompanyDiagramPopup'
      )
    })
  }

  static edit(id: string) {
    return new Promise<CompanyDiagram | null>((resolve) => {
      TopView.show(
        <PopupContainer
          id={id}
          resolve={(v) => {
            resolve(v)
            this.hide()
          }}
        />,
        'ManageCompanyDiagramPopup'
      )
    })
  }

  static preview(id: string) {
    return new Promise<CompanyDiagram | null>((resolve) => {
      TopView.show(
        <PreviewContainer
          id={id}
          resolve={(v) => {
            resolve(v)
            this.hide()
          }}
        />,
        'ManageCompanyDiagramPopup'
      )
    })
  }
}
