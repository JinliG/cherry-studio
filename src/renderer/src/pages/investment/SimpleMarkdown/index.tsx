import 'katex/dist/katex.min.css'

import { useSettings } from '@renderer/hooks/useSettings'
import { FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
// @ts-ignore next-line
import rehypeMathjax from 'rehype-mathjax'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

const ALLOWED_ELEMENTS =
  /<(style|p|div|span|b|i|strong|em|ul|ol|li|table|tr|td|th|thead|tbody|h[1-6]|blockquote|pre|code|br|hr|svg|path|circle|rect|line|polyline|polygon|text|g|defs|title|desc|tspan|sub|sup)/i

interface Props {
  children: string
}

const SimpleMarkdown: FC<Props> = ({ children }) => {
  const { t } = useTranslation()
  const { mathEngine } = useSettings()

  const rehypeMath = mathEngine === 'KaTeX' ? rehypeKatex : rehypeMathjax

  const rehypePlugins = useMemo(() => {
    const hasElements = ALLOWED_ELEMENTS.test(children)
    return hasElements ? [rehypeRaw, rehypeMath] : [rehypeMath]
  }, [children, rehypeMath])

  return (
    <ReactMarkdown
      className="markdown"
      rehypePlugins={rehypePlugins}
      remarkPlugins={[remarkMath, remarkGfm]}
      remarkRehypeOptions={{
        footnoteLabel: t('common.footnotes'),
        footnoteLabelTagName: 'h4',
        footnoteBackContent: ' '
      }}>
      {children}
    </ReactMarkdown>
  )
}

export default SimpleMarkdown
