import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { CompanyDiagram, CompanyTemplate } from '@renderer/types'

export interface CompanyTemplatesState {
  templates: CompanyTemplate[]
  diagrams: CompanyDiagram[]
}

const initialState: CompanyTemplatesState = {
  templates: [],
  diagrams: []
}

const companyTemplatesSlice = createSlice({
  name: 'company_templates',
  initialState,
  reducers: {
    updateCompanyTemplates: (state, action: PayloadAction<CompanyTemplate[]>) => {
      state.templates = action.payload
    },
    addCompanyTemplate: (state, action: PayloadAction<CompanyTemplate>) => {
      state.templates.push(action.payload)
    },
    removeCompanyTemplate: (state, action: PayloadAction<{ id: string }>) => {
      state.templates = state.templates.filter((c) => c.id !== action.payload.id)
    },
    updateCompanyTemplate: (state, action: PayloadAction<CompanyTemplate>) => {
      state.templates = state.templates.map((c) => (c.id === action.payload.id ? action.payload : c))
    },
    updateCompanyDiagrams: (state, action: PayloadAction<CompanyTemplate[]>) => {
      state.diagrams = action.payload
    },
    addCompanyDiagram: (state, action: PayloadAction<CompanyDiagram>) => {
      state.diagrams.push(action.payload)
    },
    removeCompanyDiagram: (state, action: PayloadAction<{ id: string }>) => {
      state.diagrams = state.diagrams.filter((c) => c.id !== action.payload.id)
    },
    updateCompanyDiagram: (state, action: PayloadAction<CompanyDiagram>) => {
      state.diagrams = state.diagrams.map((c) => (c.id === action.payload.id ? action.payload : c))
    }
  }
})

export const {
  updateCompanyTemplates,
  addCompanyTemplate,
  removeCompanyTemplate,
  updateCompanyTemplate,
  updateCompanyDiagrams,
  addCompanyDiagram,
  removeCompanyDiagram,
  updateCompanyDiagram
} = companyTemplatesSlice.actions

export default companyTemplatesSlice.reducer
