import { CloseOutlined } from '@ant-design/icons'
import FileManager from '@renderer/services/FileManager'
import { Assistant, FileType, Topic } from '@renderer/types'
import { Tag, Upload } from 'antd'
import { filter, isEmpty, map } from 'lodash'
import { FC, ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface Props {
  assistant: Assistant
  files: FileType[]
  setFiles: (files: FileType[]) => void
  topic: Topic
  setActiveTopic: (topic: Topic) => void
  updateTopic: (topic: Topic) => void
}

const AttachmentPreview: FC<Props> = ({ files, setFiles, topic, setActiveTopic, updateTopic, assistant }) => {
  const { attachedFile, attachedText, attachedPages } = topic
  const { t } = useTranslation()

  const handleRemoveFile = (item: any) => {
    setFiles(files.filter((file) => item.uid !== file.id))
  }

  const handleRemoveAttachedText = () => {
    updateAndSetActiveTopic({ ...topic, attachedText: undefined })
  }

  const handleRemoveAttachedPage = (index: number) => {
    updateAndSetActiveTopic({
      ...topic,
      attachedPages: filter(attachedPages, (page) => page.index !== index)
    })
  }

  const updateAndSetActiveTopic = (updatedTopic: Topic) => {
    updateTopic(updatedTopic)
    setActiveTopic(updatedTopic)
  }

  const Attachments = useMemo(() => {
    const attachments: ReactNode[] = []

    if (attachedText) {
      attachments.push(
        <div key="attachedText" className="attach-text">
          <div className="attach-text-content">{attachedText}</div>
          <CloseOutlined className="close-icon" onClick={handleRemoveAttachedText} />
        </div>
      )
    }

    if (!isEmpty(files)) {
      attachments.push(
        <Upload
          key="files"
          listType={files.length > 20 ? 'text' : 'picture-card'}
          fileList={files.map((file) => ({
            uid: file.id,
            url: 'file://' + FileManager.getSafePath(file),
            status: 'done',
            name: file.name
          }))}
          onRemove={handleRemoveFile}
        />
      )
    }

    if (!isEmpty(attachedPages)) {
      attachments.push(
        <div key="attachedPages" className="attach-list">
          {map(attachedPages, ({ index }) => (
            <Tag
              key={index}
              closable
              color="green"
              onClose={(e) => {
                e.preventDefault()
                handleRemoveAttachedPage(index)
              }}>
              {t('第{{index}}页', { index })}
            </Tag>
          ))}
        </div>
      )
    }

    if (!isEmpty(attachedFile) && isEmpty(attachedPages) && isEmpty(assistant.knowledge_bases)) {
      attachments.push(
        <div key="attachedFile" className="attach-file">
          {t('正在关联文档：')}
          {attachedFile?.origin_name}
        </div>
      )
    }

    return attachments
  }, [files, attachedFile, attachedText, attachedPages, assistant.knowledge_bases])

  if (isEmpty(Attachments)) {
    return null
  }

  return <ContentContainer>{Attachments}</ContentContainer>
}

const ContentContainer = styled.div`
  max-height: 40vh;
  overflow-y: auto;
  width: 100%;
  padding: 10px 15px 0;

  .attach-file {
    width: fit-content;
    padding: 2px 8px;
    background-color: var(--color-primary);
    border-radius: 4px;
    color: var(--color-white);
  }

  .attach-text {
    padding: 2px 6px;
    color: var(--color-gray-1);
    background-color: var(--color-background-mute);
    border-radius: 4px;
    display: flex;
  }

  .close-icon {
    cursor: pointer;
    &:hover {
      opacity: 0.8;
    }
  }

  .attach-text-content {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`

export default AttachmentPreview
