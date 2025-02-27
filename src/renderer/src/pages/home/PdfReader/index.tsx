import { Assistant, Topic } from '@renderer/types'
import React, { useMemo, useState, useEffect, useRef } from 'react'
import { pdfjs, Document, Page } from 'react-pdf'
import styled from 'styled-components'

import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { Pagination } from 'antd'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/'
}

interface Props {
  assistant: Assistant
  topic: Topic
}

const PdfReader: React.FC<Props> = (props) => {
  const { topic, assistant } = props

  const containerRef = useRef<HTMLDivElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [pageTotal, setPageTotal] = useState(0)
  const [pageCurrent, setPageCurrent] = useState(1)
  const [showPagination, setShowPagination] = useState(false)
  const [containerWidth, setContainerWidth] = useState<number>(0)

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth - 24)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const loadFile = async () => {
      if (topic.attachedFile) {
        const { data, mime } = await window.api.file.binaryFile(topic.attachedFile.id + topic.attachedFile.ext)
        setFile(new File([data], topic.attachedFile.name, { type: mime }))
      }
    }

    loadFile()
  }, [topic.attachedFile])

  useEffect(() => {
    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (let entry of entries) {
        if (entry.contentBoxSize) {
          // Firefox implements `contentBoxSize` as a single content rect, rather than an array
          const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize
          setContainerWidth(contentBoxSize.inlineSize)
        } else {
          setContainerWidth(entry.contentRect.width)
        }
      }
    }

    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(containerRef.current)

      return () => {
        if (containerRef.current) {
          resizeObserver.unobserve(containerRef.current)
        }
      }
    }
  }, [containerRef])

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
      ref={containerRef}
      onMouseOver={() => {
        setShowPagination(true)
      }}
      onMouseLeave={() => {
        setShowPagination(false)
      }}>
      {pdfFile && (
        <Document className="pdf-reader" file={pdfFile} options={options} onLoadSuccess={onLoadSuccess}>
          <Page pageNumber={pageCurrent} width={containerWidth} />
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

  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .pagination {
    z-index: 5;
    position: sticky;
    bottom: 20px;
    left: 50%;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;

    &.show {
      opacity: 1;
    }
  }
`

export default PdfReader
