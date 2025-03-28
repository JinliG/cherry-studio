import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  addCompanyDiagram,
  addCompanyTemplate,
  removeCompanyDiagram,
  removeCompanyTemplate,
  updateCompanyDiagram,
  updateCompanyDiagrams,
  updateCompanyTemplate,
  updateCompanyTemplates
} from '@renderer/store/company_templates'
import { CompanyDiagram, CompanyTemplate } from '@renderer/types'

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

export function useCompanyDiagrams() {
  const diagrams = useAppSelector((state) => state.company_templates.diagrams)
  const dispatch = useAppDispatch()

  return {
    diagrams,
    updateCompanyDiagrams: (diagrams: CompanyDiagram[]) => dispatch(updateCompanyDiagrams(diagrams)),
    addCompanyDiagram: (diagram: CompanyDiagram) => dispatch(addCompanyDiagram(diagram)),
    removeCompanyDiagram: (id: string) => dispatch(removeCompanyDiagram({ id }))
  }
}

export function useCompanyDiagram(id: string) {
  const diagram = useAppSelector((state) => state.company_templates.diagrams.find((a) => a.id === id)) as CompanyDiagram
  const dispatch = useAppDispatch()

  return {
    diagram,
    updateCompanyDiagram: (diagram: CompanyDiagram) => dispatch(updateCompanyDiagram(diagram)),
    removeCompanyDiagram: () => dispatch(removeCompanyDiagram({ id }))
  }
}
