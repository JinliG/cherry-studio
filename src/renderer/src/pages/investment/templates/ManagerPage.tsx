import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Navbar, NavbarCenter } from '@renderer/components/app/Navbar'
import Scrollbar from '@renderer/components/Scrollbar'
import { useCompanyTemplates } from '@renderer/hooks/useCompanyTemplates'
import { CompanyTemplate } from '@renderer/types'
import { modalConfirm } from '@renderer/utils'
import { Button, Flex, Space, Table, Tabs as TabsAntd, Typography } from 'antd'
import { ColumnsType } from 'antd/es/table'
import { FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import ManageCompanyTemplatePopup from './ManageTemplatePopup'

const { Title } = Typography

const CompanyTemplatePage: FC = () => {
  const { t, i18n } = useTranslation()
  const { templates, removeCompanyTemplate } = useCompanyTemplates()

  const deleteConfirm = (id: string) => {
    modalConfirm({
      title: t('确定删除该模板吗？'),
      content: t('删除后不可恢复，请谨慎操作。'),
      onOk: () => {
        removeCompanyTemplate(id)
      }
    })
  }

  const columns: ColumnsType<CompanyTemplate> = [
    {
      title: t('名称'),
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: t('信息结构'),
      dataIndex: 'structure',
      key: 'structure',
      ellipsis: true,
      width: 400
    },
    {
      title: '',
      dataIndex: 'operations',
      key: 'operations',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => ManageCompanyTemplatePopup.edit(record.id)} />
          <Button type="text" icon={<DeleteOutlined />} onClick={() => deleteConfirm(record.id)} />
        </Space>
      )
    }
  ]

  const tabItems = useMemo(() => {
    return [
      {
        label: '企业信息模板',
        key: 'template',
        children: (
          <TabContent key="template">
            <Flex justify="space-between">
              <Title level={5} key="template" style={{ marginBottom: 10 }}>
                {t('企业信息模板')}
              </Title>
              <Button type="primary" onClick={() => ManageCompanyTemplatePopup.show()}>
                {t('新建模板')}
              </Button>
            </Flex>
            <Table columns={columns} dataSource={templates} />
          </TabContent>
        )
      },
      {
        label: '企业信息图谱',
        key: 'table',
        children: (
          <TabContent key="table">
            <Title level={5} key="table" style={{ marginBottom: 10 }}>
              {t('企业信息模板')}
            </Title>
          </TabContent>
        )
      }
    ]
  }, [])

  return (
    <Container>
      <Navbar>
        <NavbarCenter style={{ borderRight: 'none' }}>{t('company_template.title')}</NavbarCenter>
      </Navbar>
      <ContentContainer id="content-container">
        <AssistantsContainer>
          <Tabs tabPosition="right" animated={false} items={tabItems} $language={i18n.language} />
        </AssistantsContainer>
      </ContentContainer>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
`

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: center;
  height: 100%;
  padding: 0 10px;
  padding-left: 0;
  border-top: 0.5px solid var(--color-border);
`

const AssistantsContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  height: calc(100vh - var(--navbar-height));
`

const TabContent = styled(Scrollbar)`
  height: calc(100vh - var(--navbar-height));
  padding: 10px 10px 10px 15px;
  margin-right: -4px;
  padding-bottom: 20px !important;
  overflow-x: hidden;
  transform: translateZ(0);
  will-change: transform;
  -webkit-font-smoothing: antialiased;
`

// const EmptyView = styled.div`
//   display: flex;
//   flex: 1;
//   justify-content: center;
//   align-items: center;
//   font-size: 16px;
//   color: var(--color-text-secondary);
// `

const Tabs = styled(TabsAntd)<{ $language: string }>`
  display: flex;
  flex: 1;
  flex-direction: row-reverse;

  .ant-tabs-tabpane {
    padding-right: 0 !important;
  }
  .ant-tabs-nav {
    min-width: ${({ $language }) => ($language.startsWith('zh') ? '160px' : '200px')};
    max-width: ${({ $language }) => ($language.startsWith('zh') ? '160px' : '200px')};
    position: relative;
    overflow: hidden;
  }
  .ant-tabs-nav-list {
    padding: 10px 8px;
  }
  .ant-tabs-nav-operations {
    display: none !important;
  }
  .ant-tabs-tab {
    margin: 0 !important;
    border-radius: var(--list-item-border-radius);
    margin-bottom: 5px !important;
    font-size: 13px;
    justify-content: left;
    padding: 7px 15px !important;
    border: 0.5px solid transparent;
    justify-content: ${({ $language }) => ($language.startsWith('zh') ? 'center' : 'flex-start')};
    user-select: none;
    transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
    outline: none !important;
    .ant-tabs-tab-btn {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100px;
      transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
      outline: none !important;
    }
    &:hover {
      color: var(--color-text) !important;
      background-color: var(--color-background-soft);
    }
  }
  .ant-tabs-tab-active {
    background-color: var(--color-background-soft);
    border: 0.5px solid var(--color-border);
    transform: scale(1.02);
  }
  .ant-tabs-content-holder {
    border-left: 0.5px solid var(--color-border);
    border-right: none;
  }
  .ant-tabs-ink-bar {
    display: none;
  }
  .ant-tabs-tab-btn:active {
    color: var(--color-text) !important;
  }
  .ant-tabs-tab-active {
    .ant-tabs-tab-btn {
      color: var(--color-text) !important;
    }
  }
  .ant-tabs-content {
    transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
  }
`

export default CompanyTemplatePage
