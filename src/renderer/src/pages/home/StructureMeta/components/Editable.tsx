import { Button, Flex, Input, Space } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { noop } from 'lodash'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface EditableProps extends React.PropsWithChildren {
  text: string
  editable?: boolean
  textarea?: boolean
  onChange?: (value: string) => void
  onCancel?: () => void
  onPressEnter?: () => void
}

const Editable: React.FC<EditableProps> = ({
  text,
  editable = false,
  textarea = false,
  onPressEnter = noop,
  onCancel = noop,
  onChange = noop,
  children
}) => {
  const { t } = useTranslation()
  if (!editable) {
    return <div>{children}</div>
  }

  if (textarea) {
    return (
      <Flex gap={4} vertical>
        <TextArea autoFocus value={text} onChange={(e) => onChange(e.target.value)} />
        <Space style={{ alignSelf: 'flex-end' }}>
          <Button
            size="small"
            type="link"
            onClick={onCancel}
            style={{
              color: 'var(--color-text-2)'
            }}>
            {t('取消')}
          </Button>
          <Button
            size="small"
            type="link"
            onClick={onPressEnter}
            style={{
              color: 'var(--color-primary)'
            }}>
            {t('确定')}
          </Button>
        </Space>
      </Flex>
    )
  }

  return (
    <SimpleInput
      autoFocus
      type="text"
      value={text}
      onChange={(e) => onChange(e.target.value)}
      onPressEnter={onPressEnter}
    />
  )
}

export default Editable

const SimpleInput = styled(Input)`
  margin-bottom: 4px;
  width: 90%;
  // border: none;
  // background: transparent;
  // outline: none;
  // padding: 0;
  // margin: 0;
  // font-size: inherit;
  // color: inherit;
`
