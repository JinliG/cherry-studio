import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { CompanyTemplate } from '@renderer/types'

export interface CompanyTemplatesState {
  templates: CompanyTemplate[]
}

const initialState: CompanyTemplatesState = {
  templates: []
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
      console.log('--- xxx', state, action.payload)
      state.templates = state.templates.map((c) => (c.id === action.payload.id ? action.payload : c))
    }
  }
})

export const { updateCompanyTemplates, addCompanyTemplate, removeCompanyTemplate, updateCompanyTemplate } =
  companyTemplatesSlice.actions

export default companyTemplatesSlice.reducer
