import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

import {
  DoubleLeftOutlined,
  DoubleRightOutlined,
  SelectOutlined,
  ZoomInOutlined,
  ZoomOutOutlined
} from '@ant-design/icons'
import { Assistant, Topic } from '@renderer/types'
import { Button, Checkbox, Flex, Pagination } from 'antd'
import { debounce, filter, find } from 'lodash'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Document, Outline, Page, pdfjs } from 'react-pdf'
import styled from 'styled-components'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/'
}

const PdfStatueRender = {
  LOADING: () => <div className="document-status">Loading PDF...</div>,
  ERROR: () => <div className="document-status">Error loading PDF</div>,
  NO_DATA: () => <div className="document-status">No PDF data</div>
}

interface Props {
  assistant: Assistant
  topic: Topic
  pageWidth: number
}

type PageContentMap = {
  index: number
  pageContent: string
}

const PdfReader: React.FC<Props> = (props) => {
  const { topic, pageWidth } = props

  const [file, setFile] = useState<File | null>(null)
  const [pageTotal, setPageTotal] = useState(0)
  const [pageCurrent, setPageCurrent] = useState(1)
  const [showPagination, setShowPagination] = useState(false)
  const [pageContent, setPageContent] = useState('')
  const [showIndex, setShowIndex] = useState(false)
  const [showSelect, setShowSelect] = useState(false)
  const [scale, setScale] = useState(1)
  const [selectedPages, setSelectedPages] = useState<PageContentMap[]>([])

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

  const checked = useMemo(() => {
    return !!find(selectedPages, (page) => page.index === pageCurrent)
  }, [selectedPages, pageCurrent])

  const handleTriggerSelectedPages = () => {
    if (checked) {
      setSelectedPages(filter(selectedPages, (page) => page.index !== pageCurrent))
    } else {
      setSelectedPages((state) => [...state, { index: pageCurrent, pageContent }])
    }
  }

  const pdfFile = useMemo(() => {
    if (file) {
      return file
    }

    return null
  }, [file])

  const onZoomIn = debounce(() => {
    setScale(scale + 0.2)
  }, 100)

  const onZoomOut = debounce(() => {
    setScale(scale - 0.2)
  }, 100)

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
      {!showIndex && (
        <Button
          size="small"
          className="index-trigger"
          onClick={() => setShowIndex(true)}
          icon={<DoubleRightOutlined />}>
          {t('目录')}
        </Button>
      )}
      {showSelect && (
        <Checkbox
          checked={checked}
          className={`page-checker ${checked ? 'checked' : ''}`}
          onChange={handleTriggerSelectedPages}>
          {checked ? t('√ 已选中') : t('点击选中当前页')}
        </Checkbox>
      )}
      <OperationWrapper vertical align="flex-end" gap={8}>
        <OperateButton
          icon={<SelectOutlined />}
          data-active={showSelect}
          onClick={() => {
            setShowSelect((state) => !state)
          }}
        />
        <OperateButton icon={<ZoomInOutlined />} onClick={onZoomIn} />
        <OperateButton icon={<ZoomOutOutlined />} onClick={onZoomOut} />
      </OperationWrapper>
      {pdfFile && (
        <Document
          className="document"
          file={pdfFile}
          options={options}
          onLoadSuccess={onLoadSuccess}
          loading={PdfStatueRender.LOADING}
          error={PdfStatueRender.ERROR}
          noData={PdfStatueRender.NO_DATA}>
          <Page
            pageNumber={pageCurrent}
            width={pageWidth}
            scale={scale}
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
            loading={null}
            error={null}
            noData={null}
          />
          <OutlineWrapper className={showIndex ? 'visible' : ''}>
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
          </OutlineWrapper>
          <Pagination
            size="small"
            className={`pagination ${showPagination ? 'show' : ''}`}
            align="center"
            total={pageTotal}
            pageSize={1}
            showSizeChanger={false}
            showQuickJumper
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

  .index-trigger {
    position: absolute;
    left: 0;
    top: 12px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: unset;
    z-index: 4;
  }

  .page-checker {
    position: absolute;
    right: 12px;
    top: 12px;
    z-index: 4;
    flex-direction: row-reverse;

    &.checked {
      color: var(--color-primary);
    }
  }

  .document {
    height: 100%;
    position: relative;

    .document-status,
    .page-status {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }

  .pagination {
    z-index: 4;
    position: sticky;
    right: 0;
    left: 0;
    top: 0;
    bottom: 0;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
    background-color: var(--color-background);
    padding-top: 8px;

    &.show {
      opacity: 1;
    }
  }
`

const OutlineWrapper = styled.div`
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

  &.visible {
    width: 100%;
  }

  .index-header {
    position: sticky;
    top: 0;
    padding: 0 12px;
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    background-color: var(--color-background);
  }
`
const OperationWrapper = styled(Flex)`
  z-index: 4;
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
`

const OperateButton = styled(Button)`
  &[data-active='true'] {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }
`

export default PdfReader
