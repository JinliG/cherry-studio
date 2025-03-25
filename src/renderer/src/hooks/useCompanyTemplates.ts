import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  addCompanyTemplate,
  removeCompanyTemplate,
  updateCompanyTemplate,
  updateCompanyTemplates
} from '@renderer/store/company_templates'
import { CompanyTemplate } from '@renderer/types'

export function useCompanyTemplates() {
  const templates = useAppSelector((state) => state.company_templates.templates)
  const dispatch = useAppDispatch()

  return {
    templates,
    updateCompanyTemplates: (templates: CompanyTemplate[]) => dispatch(updateCompanyTemplates(templates)),
    addCompanyTemplate: (template: CompanyTemplate) => dispatch(addCompanyTemplate(template)),
    removeCompanyTemplate: (id: string) => dispatch(removeCompanyTemplate({ id }))
  }
}

export function useCompanyTemplate(id: string) {
  const template = useAppSelector(
    (state) => state.company_templates.templates.find((a) => a.id === id) as CompanyTemplate
  )
  const dispatch = useAppDispatch()

  return {
    template,
    updateCompanyTemplate: (template: CompanyTemplate) => dispatch(updateCompanyTemplate(template))
  }
}
