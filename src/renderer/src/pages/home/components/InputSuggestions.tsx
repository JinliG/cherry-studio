// import { fetchSuggestions } from '@renderer/services/ApiService'
import { EVENT_NAMES, EventEmitter } from '@renderer/services/EventService'
import { Assistant, InputSuggestion, Message, Suggestion } from '@renderer/types'
import { uuid } from '@renderer/utils'
import dayjs from 'dayjs'
import { last } from 'lodash'
import { FC, useEffect, useState } from 'react'
import BeatLoader from 'react-spinners/BeatLoader'
import styled from 'styled-components'

interface Props {
  assistant: Assistant
  messages: Message[]
}

const inputSuggestionsMap = new Map<string, InputSuggestion[]>()

const InputSuggestions: FC<Props> = ({ assistant, messages }) => {
  const lastMessage = last(messages)
  const [suggestions, setSuggestions] = useState<InputSuggestion[]>(
    inputSuggestionsMap.get(lastMessage?.id || '') || []
  )
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
    setSuggestions(inputSuggestionsMap.get(lastMessage?.id || '') || [])
  }, [lastMessage])

  if (lastMessage?.status !== 'success') {
    return null
  }

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
            {s.label} →
          </SuggestionItem>
        ))}
      </SuggestionsContainer>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px 10px 20px 65px;
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
