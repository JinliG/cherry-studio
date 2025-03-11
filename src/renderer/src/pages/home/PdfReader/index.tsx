import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

import { DoubleLeftOutlined, DoubleRightOutlined } from '@ant-design/icons'
import { Assistant, Topic } from '@renderer/types'
import { Button, Pagination } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Document, Outline, Page, pdfjs } from 'react-pdf'
import styled from 'styled-components'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/'
}

interface Props {
  assistant: Assistant
  topic: Topic
  pageWidth: number
}

const PdfReader: React.FC<Props> = (props) => {
  const { topic, pageWidth } = props

  const [file, setFile] = useState<File | null>(null)
  const [pageTotal, setPageTotal] = useState(0)
  const [pageCurrent, setPageCurrent] = useState(1)
  const [showPagination, setShowPagination] = useState(false)
  const [pageContent, setPageContent] = useState('')
  const [showIndex, setShowIndex] = useState(false)

  const { t } = useTranslation()

  useEffect(() => {
    const loadFile = async () => {
      if (topic.attachedFile) {
        const { data, mime } = await window.api.file.binaryFile(topic.attachedFile.id + topic.attachedFile.ext)
        setFile(new File([data], topic.attachedFile.name, { type: mime }))
      }
    }

    loadFile()
  }, [topic.attachedFile])

  const pdfFile = useMemo(() => {
    if (file) {
      return file
    }

    return null
  }, [file])

  const onLoadSuccess = (pdf: any) => {
    setPageTotal(pdf.numPages)
  }

  console.log('--- pageContent', pageContent)

  return (
    <Container
      onMouseOver={() => {
        setShowPagination(true)
      }}
      onMouseLeave={() => {
        setShowPagination(false)
      }}>
      {!showIndex && (
        <Button size="small" className="show-index" onClick={() => setShowIndex(true)} icon={<DoubleRightOutlined />}>
          {t('目录')}
        </Button>
      )}
      {pdfFile && (
        <Document className="document" file={pdfFile} options={options} onLoadSuccess={onLoadSuccess}>
          <Page
            pageNumber={pageCurrent}
            width={pageWidth}
            scale={1}
            onGetTextSuccess={({ items }) => {
              setPageContent(
                items.reduce((acc, item: any) => {
                  if (item.str === '') {
                    return acc + `\r\n`
                  }
                  return acc + item.str
                }, ``)
              )
            }}
          />
          <div className={`outline-index ${showIndex ? 'visible' : ''}`}>
            <div className="index-header">
              <span>{t('目录')}</span>
              <Button size="small" onClick={() => setShowIndex(false)} icon={<DoubleLeftOutlined />}>
                {t('收起')}
              </Button>
            </div>
            <Outline
              onItemClick={({ pageNumber }) => {
                setPageCurrent(pageNumber)
                setShowIndex(false)
              }}
            />
          </div>
          <Pagination
            className={`pagination ${showPagination ? 'show' : ''}`}
            align="center"
            total={pageTotal}
            pageSize={1}
            showSizeChanger={false}
            current={pageCurrent}
            onChange={setPageCurrent}
          />
        </Document>
      )}
    </Container>
  )
}

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  flex: 1;
  border-right: 0.5px solid var(--color-border);
  overflow-y: auto;
  padding: 12px 12px 12px 0;

  .show-index {
    position: absolute;
    left: 0;
    top: 60px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: unset;
    z-index: 5;
  }
  .document {
    height: 100%;
    position: relative;
  }

  .outline-index {
    position: absolute;
    width: 0;
    height: 100%;
    left: 0;
    top: 0;
    bottom: 0;
    overflow-y: auto;
    z-index: 5;
    background-color: var(--color-background);
    transition: width 0.2s ease-in-out;
    padding-top: 32px;

    &.visible {
      width: 100%;
    }

    .index-header {
      position: absolute;
      top: 0;
      left: 12px;
      right: 12px;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
    }
  }

  .pagination {
    z-index: 4;
    position: sticky;
    right: 0;
    left: 0;
    top: 100vh;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;

    &.show {
      opacity: 1;
    }
  }
`

export default PdfReader
