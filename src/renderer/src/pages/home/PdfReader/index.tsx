import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

import { Assistant, Topic } from '@renderer/types'
import { Pagination } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
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

  return (
    <Container
      onMouseOver={() => {
        setShowPagination(true)
      }}
      onMouseLeave={() => {
        setShowPagination(false)
      }}>
      {pdfFile && (
        <Document className="document" file={pdfFile} options={options} onLoadSuccess={onLoadSuccess}>
          <Page pageNumber={pageCurrent} width={pageWidth} scale={1} />
        </Document>
      )}
      <Pagination
        className={`pagination ${showPagination ? 'show' : ''}`}
        align="center"
        total={pageTotal}
        pageSize={1}
        current={pageCurrent}
        onChange={setPageCurrent}
      />
    </Container>
  )
}

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  flex: 1;
  padding: 12px;
  border-right: 0.5px solid var(--color-border);
  overflow-y: auto;

  .pagination {
    z-index: 5;
    position: absolute;
    right: 0;
    left: 0;
    // top: calc(100vh - 48px);
    bottom: 20px;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;

    &.show {
      opacity: 1;
    }
  }
`

export default PdfReader
