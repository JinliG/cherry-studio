import { SnippetsOutlined } from '@ant-design/icons'
import FileManager from '@renderer/services/FileManager'
import { FileType } from '@renderer/types'
import { Tooltip } from 'antd'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  ToolbarButton: any
  onSelectFileCallback: (file: FileType) => void
}

const DocAttachmentButton: FC<Props> = ({ ToolbarButton, onSelectFileCallback }) => {
  const { t } = useTranslation()

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
      onSelectFileCallback(files[0])
    }
  }

  return (
    <Tooltip placement="top" title={t('文档专注模式')} arrow>
      <ToolbarButton type="text" onClick={onSelectFile}>
        <SnippetsOutlined />
      </ToolbarButton>
    </Tooltip>
  )
}

export default DocAttachmentButton
