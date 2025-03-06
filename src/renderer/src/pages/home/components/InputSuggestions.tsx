import { BUILD_SUGGESTION_PROMPT } from '@renderer/config/prompts'
import { fetchTopicSuggestions } from '@renderer/services/ApiService'
import { EVENT_NAMES, EventEmitter } from '@renderer/services/EventService'
import { Assistant, Message, Suggestion } from '@renderer/types'
import { uuid } from '@renderer/utils'
import dayjs from 'dayjs'
import { FC, useEffect, useState } from 'react'
import BeatLoader from 'react-spinners/BeatLoader'
import styled from 'styled-components'

interface Props {
  assistant: Assistant
  messages: Message[]
  lastInputText: string
}

let _lastSuggestions: Suggestion[] = []

const InputSuggestions: FC<Props> = ({ assistant, lastInputText: currentInputText }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(_lastSuggestions)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const onClick = (s: Suggestion) => {
    const message: Message = {
      id: uuid(),
      role: 'user',
      content: s.content,
      assistantId: assistant.id,
      topicId: assistant.topics[0].id || uuid(),
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      type: 'text',
      status: 'success'
    }

    EventEmitter.emit(EVENT_NAMES.SEND_MESSAGE, message)
  }

  useEffect(() => {
    const unsubscribes = [
      EventEmitter.on(EVENT_NAMES.RECEIVE_MESSAGE, async (msg: Message) => {
        setLoadingSuggestions(true)

        try {
          const generatedText = await fetchTopicSuggestions({
            assistant,
            prompt: BUILD_SUGGESTION_PROMPT.replace('{user}', currentInputText).replace('{assistant}', msg.content),
            content: currentInputText
          })
          const _suggestions = generatedText.split(',').map((content) => {
            return {
              content: content.trim()
            }
          })

          if (_suggestions.length) {
            setSuggestions(_suggestions)
            _lastSuggestions = _suggestions
          }
        } catch (error) {
          console.error('Error fetching data:', error)
        }

        setLoadingSuggestions(false)
      })
    ]
    return () => unsubscribes.forEach((unsub) => unsub())
  }, [currentInputText])

  if (loadingSuggestions) {
    return (
      <Container>
        <BeatLoader color="var(--color-text-2)" size="10" />
      </Container>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <Container>
      <SuggestionsContainer>
        {suggestions.map((s, i) => (
          <SuggestionItem key={i} onClick={() => onClick(s)}>
            {s.content} →
          </SuggestionItem>
        ))}
      </SuggestionsContainer>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px 20px;
  display: flex;
  width: 100%;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 15px;
`

const SuggestionsContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 10px;
`

const SuggestionItem = styled.div`
  display: flex;
  align-items: center;
  width: fit-content;
  padding: 5px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: var(--color-text);
  background: var(--color-background-mute);
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`

export default InputSuggestions
