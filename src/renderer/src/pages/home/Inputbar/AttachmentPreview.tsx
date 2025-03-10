import { CloseOutlined } from '@ant-design/icons'
import FileManager from '@renderer/services/FileManager'
import { FileType, Topic } from '@renderer/types'
import { Upload } from 'antd'
import { isEmpty } from 'lodash'
import { FC } from 'react'
import styled from 'styled-components'

interface Props {
  files: FileType[]
  setFiles: (files: FileType[]) => void
  topic: Topic
  setActiveTopic: (topic: Topic) => void
  updateTopic: (topic: Topic) => void
}

const AttachmentPreview: FC<Props> = ({ files, setFiles, topic, setActiveTopic, updateTopic }) => {
  if (isEmpty(files) && isEmpty(topic.attachedText)) {
    return null
  }

  const onRemoveAttachedText = () => {
    const data = {
      ...topic,
      attachedText: undefined
    }
    updateTopic(data)
    setActiveTopic(data)
  }

  return (
    <ContentContainer>
      {topic.attachedText && (
        <div className="attach-text">
          <div className="attach-text-content">{topic.attachedText}</div>
          <CloseOutlined className="close-icon" onClick={onRemoveAttachedText} />
        </div>
      )}
      {!isEmpty(files) && (
        <Upload
          listType={files.length > 20 ? 'text' : 'picture-card'}
          fileList={files.map((file) => ({
            uid: file.id,
            url: 'file://' + FileManager.getSafePath(file),
            status: 'done',
            name: file.name
          }))}
          onRemove={(item) => setFiles(files.filter((file) => item.uid !== file.id))}
        />
      )}
    </ContentContainer>
  )
}

const ContentContainer = styled.div`
  max-height: 40vh;
  overflow-y: auto;
  width: 100%;
  padding: 10px 15px 0;

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
