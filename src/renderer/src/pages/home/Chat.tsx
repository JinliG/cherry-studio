import { ATTACHED_DOC_INDEX_PROMPT } from '@renderer/config/prompts'
import { useSettings } from '@renderer/hooks/useSettings'
import { useShowTopics } from '@renderer/hooks/useStore'
import { fetchTextByPrompt } from '@renderer/services/ApiService'
import { Assistant, Topic } from '@renderer/types'
import { Flex } from 'antd'
import { FC, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

import Inputbar from './Inputbar/Inputbar'
import Messages from './Messages/Messages'
import PdfReader from './PdfReader'
import Tabs from './Tabs'

interface Props {
  assistant: Assistant
  activeTopic: Topic
  setActiveTopic: (topic: Topic) => void
  setActiveAssistant: (assistant: Assistant) => void
}

const Chat: FC<Props> = (props) => {
  const { activeTopic, assistant } = props
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { topicPosition, messageStyle, showAssistants } = useSettings()
  const { showTopics } = useShowTopics()

  const [wrapperWidth, setWrapperWidth] = useState<number>(0)

  const docFocusMode = !!activeTopic.attachedFile

  const handleGenerateDocIndex = async () => {
    if (!activeTopic.attachedFile) {
      return
    }
    const file = activeTopic.attachedFile
    const fileContent = await (await window.api.file.read(file.id + file.ext)).trim()
    try {
      const indexJson = await fetchTextByPrompt({
        assistant,
        prompt: ATTACHED_DOC_INDEX_PROMPT.SYSTEM,
        content: ATTACHED_DOC_INDEX_PROMPT.USER.replace('{file_content}', fileContent)
      })
      console.log('--- generatedText', indexJson)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        setWrapperWidth(wrapperRef.current.offsetWidth)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          // Firefox implements `contentBoxSize` as a single content rect, rather than an array
          const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize
          setWrapperWidth(contentBoxSize.inlineSize)
        } else {
          setWrapperWidth(entry.contentRect.width)
        }
      }
    }

    if (wrapperRef.current) {
      const resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(wrapperRef.current)

      return () => {
        if (wrapperRef.current) {
          resizeObserver.unobserve(wrapperRef.current)
        }
      }
    }
  }, [wrapperRef.current])

  const pageWidth = useMemo(() => (wrapperWidth ? wrapperWidth * 0.5 - 56 : 0), [wrapperWidth])

  const maxWidth = useMemo(() => {
    const showRightTopics = showTopics && topicPosition === 'right'
    const minusAssistantsWidth = showAssistants ? '- var(--assistants-width)' : ''
    const minusRightTopicsWidth = showRightTopics ? '- var(--assistants-width)' : ''
    return `calc(100vw - var(--sidebar-width) ${minusAssistantsWidth} ${minusRightTopicsWidth} - 5px)`
  }, [showAssistants, showTopics, topicPosition])

  return (
    <Container id="chat" className={messageStyle}>
      <Wrapper ref={wrapperRef}>
        {docFocusMode && (
          <div
            className="pdf-container"
            style={{
              width: pageWidth + 24
            }}>
            <PdfReader assistant={assistant} topic={activeTopic} pageWidth={pageWidth} />
          </div>
        )}
        <Main
          id="chat-main"
          vertical
          flex={1}
          justify="space-between"
          style={{
            maxWidth
          }}>
          <Messages
            key={activeTopic.id}
            assistant={assistant}
            topic={activeTopic}
            setActiveTopic={props.setActiveTopic}
          />
          <Inputbar
            docFocusMode={docFocusMode}
            assistant={assistant}
            setActiveTopic={props.setActiveTopic}
            activeTopic={activeTopic}
          />
        </Main>
      </Wrapper>
      {topicPosition === 'right' && showTopics && (
        <Tabs
          activeAssistant={assistant}
          activeTopic={activeTopic}
          setActiveAssistant={props.setActiveAssistant}
          setActiveTopic={props.setActiveTopic}
          position="right"
        />
      )}
    </Container>
  )
}

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: row;
  flex: 1;
  justify-content: space-between;
`

const Wrapper = styled(Flex)`
  width: 100%;

  .pdf-container {
    width: 50%;
  }
`

const Main = styled(Flex)`
  height: calc(100vh - var(--navbar-height));
`

export default Chat
