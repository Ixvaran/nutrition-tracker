import { z } from 'zod'

// Mifflin-St Jeor input validation
export const recalculateMacrosSchema = z.object({
  gender: z.enum(['male', 'female']),
  weight: z.coerce.number().min(30, 'Weight must be at least 30 kg').max(300, 'Weight must be at most 300 kg'),
  height: z.coerce.number().min(100, 'Height must be at least 100 cm').max(250, 'Height must be at most 250 cm'),
  age: z.coerce.number().min(10, 'Age must be at least 10 years').max(120, 'Age must be at most 120 years'),
  activityLevel: z.coerce.number().min(1.2).max(2.5),
  goal: z.enum(['lose', 'maintain', 'gain']).default('maintain')
})

export type RecalculateMacrosInput = z.infer<typeof recalculateMacrosSchema>

// Zod schema for validation of DeepSeek's AI response
export const ingredientSchema = z.object({
  ingredient_name: z.string(),
  estimated_grams: z.number().min(0),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
})

export const aiExtractionResponseSchema = z.object({
  food_name: z.string(),
  parsed_ingredients: z.array(ingredientSchema),
  total_calories: z.number().min(0),
  total_protein: z.number().min(0),
  total_carbs: z.number().min(0),
  total_fat: z.number().min(0),
})

export type AIExtractionResponse = z.infer<typeof aiExtractionResponseSchema>

// Zod schema for manual / saved food addition
export const addFoodSchema = z.object({
  food_name: z.string().min(1, 'Food name is required'),
  calories: z.coerce.number().min(0),
  protein: z.coerce.number().min(0),
  carbs: z.coerce.number().min(0),
  fat: z.coerce.number().min(0),
  multiplier: z.coerce.number().min(0.01).default(1),
  saveToDatabase: z.boolean().default(false),
  base_serving_description: z.string().default('1 serving'),
})

export type AddFoodInput = z.infer<typeof addFoodSchema>
