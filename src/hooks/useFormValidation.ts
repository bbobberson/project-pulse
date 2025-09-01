'use client'

import { useState, useEffect } from 'react'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
  email?: boolean
  url?: boolean
  dateAfter?: string // field name to compare with
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule
}

export interface ValidationErrors {
  [fieldName: string]: string | null
}

export function useFormValidation(rules: ValidationRules, values: any) {
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})

  const validateField = (fieldName: string, value: any): string | null => {
    const rule = rules[fieldName]
    if (!rule) return null

    // Required validation
    if (rule.required && (!value || value.toString().trim() === '')) {
      return 'This field is required'
    }

    // Skip other validations if field is empty and not required
    if (!value || value.toString().trim() === '') {
      return null
    }

    const stringValue = value.toString()

    // Length validations
    if (rule.minLength && stringValue.length < rule.minLength) {
      return `Must be at least ${rule.minLength} characters`
    }

    if (rule.maxLength && stringValue.length > rule.maxLength) {
      return `Must be no more than ${rule.maxLength} characters`
    }

    // Email validation
    if (rule.email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(stringValue)) {
        return 'Please enter a valid email address'
      }
    }

    // URL validation
    if (rule.url) {
      try {
        new URL(stringValue)
      } catch {
        return 'Please enter a valid URL'
      }
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(stringValue)) {
      return 'Please enter a valid format'
    }

    // Date after validation
    if (rule.dateAfter && values[rule.dateAfter]) {
      const currentDate = new Date(value)
      const compareDate = new Date(values[rule.dateAfter])
      if (currentDate <= compareDate) {
        return `Must be after ${rule.dateAfter.replace('_', ' ')}`
      }
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value)
    }

    return null
  }

  const validateAll = (): boolean => {
    const newErrors: ValidationErrors = {}
    let hasErrors = false

    Object.keys(rules).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName])
      newErrors[fieldName] = error
      if (error) hasErrors = true
    })

    setErrors(newErrors)
    return !hasErrors
  }

  const validateSingle = (fieldName: string): string | null => {
    const error = validateField(fieldName, values[fieldName])
    setErrors(prev => ({ ...prev, [fieldName]: error }))
    return error
  }

  const markFieldTouched = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }))
  }

  const clearFieldError = (fieldName: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: null }))
  }

  // Real-time validation for touched fields
  useEffect(() => {
    Object.keys(touched).forEach(fieldName => {
      if (touched[fieldName]) {
        validateSingle(fieldName)
      }
    })
  }, [values, touched])

  return {
    errors,
    touched,
    validateAll,
    validateSingle,
    markFieldTouched,
    clearFieldError,
    hasErrors: Object.values(errors).some(error => error !== null),
    getFieldError: (fieldName: string) => touched[fieldName] ? errors[fieldName] : null
  }
}