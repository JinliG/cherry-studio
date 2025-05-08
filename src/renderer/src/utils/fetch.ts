import { Readability } from '@mozilla/readability'
import { nanoid } from '@reduxjs/toolkit'
import { WebSearchResult } from '@renderer/types'
import TurndownService from 'turndown'

const turndownService = new TurndownService()
export const noContent = 'No content found'

type ResponseFormat = 'markdown' | 'html' | 'text'

/**
 * Validates if the string is a properly formatted URL
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (e) {
    return false
  }
}

export async function fetchWebContents(
  urls: string[],
  format: ResponseFormat = 'markdown',
  usingBrowser: boolean = false
): Promise<WebSearchResult[]> {
  // parallel using fetchWebContent
  const results = await Promise.allSettled(urls.map((url) => fetchWebContent(url, format, usingBrowser)))
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        title: 'Error',
        content: noContent,
        url: urls[index]
      }
    }
  })
}

export async function fetchWebContent(
  url: string,
  format: ResponseFormat = 'markdown',
  usingBrowser: boolean = false
): Promise<WebSearchResult> {
  try {
    // Validate URL before attempting to fetch
    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL format: ${url}`)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    let html: string
    if (usingBrowser) {
      html = await window.api.searchService.openUrlInSearchWindow(`search-window-${nanoid()}`, url)
    } else {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      })
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }
      html = await response.text()
    }

    clearTimeout(timeoutId) // Clear the timeout if fetch completes successfully
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const article = new Readability(doc).parse()
    // console.log('Parsed article:', article)

    switch (format) {
      case 'markdown': {
        const markdown = turndownService.turndown(article?.content || '')
        return {
          title: article?.title || url,
          url: url,
          content: markdown || noContent
        }
      }
      case 'html':
        return {
          title: article?.title || url,
          url: url,
          content: article?.content || noContent
        }
      case 'text':
        return {
          title: article?.title || url,
          url: url,
          content: article?.textContent || noContent
        }
    }
  } catch (e: unknown) {
    console.error(`Failed to fetch ${url}`, e)
    return {
      title: url,
      url: url,
      content: noContent
    }
  }
}

export async function fetchWebTitle(url: string): Promise<string> {
  try {
    const response = await fetch(url, { method: 'HEAD' })

    // 尝试从 Content-Disposition 获取文件名
    const disposition = response.headers.get('Content-Disposition')
    if (disposition) {
      const utf8FilenameRegex = /filename\*=UTF-8''([\w%-.]+)/i
      const asciiFilenameRegex = /filename="?([^"]+)"?/i

      const utf8Matches = disposition.match(utf8FilenameRegex)
      if (utf8Matches && utf8Matches[1]) {
        return decodeURIComponent(utf8Matches[1])
      }

      const asciiMatches = disposition.match(asciiFilenameRegex)
      if (asciiMatches && asciiMatches[1]) {
        return asciiMatches[1]
      }
    }

    // 如果没有从 header 获取到文件名，则从 URL 提取
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1)

    // 去除扩展名并美化显示
    const title = filename
      .replace(/\.[^/.]+$/, '') // 移除 .pdf
      .replace(/[-_]/g, ' ') // 替换 - 和 _ 为空格
      .replace(/\b\w/g, (c) => c.toUpperCase()) // 首字母大写

    return title || url
  } catch (e) {
    console.warn(`Failed to fetch title`, e)
    return url
  }
}
