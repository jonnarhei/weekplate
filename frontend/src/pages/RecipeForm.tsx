import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createRecipe, getRecipe, updateRecipe } from "../api/recipes";
import toast from "react-hot-toast";
import type { RecipeInput } from "../api/types";
import RecipeThumb from "../components/RecipeThumb";

type IngredientRow = { id: number; name: string; amount: string; unit: string; }

let nextRowId = 0
const newRow = (row: Omit<IngredientRow, 'id'> = { name: '', amount: '', unit: '' }): IngredientRow =>
    ({ id: nextRowId++, ...row })

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
const inputClasses = "w-full min-w-0 border border-stone-200 rounded-[10px] bg-white px-3.5 py-2.5 text-[15px] text-stone-900 outline-none transition-colors focus:border-orange-400"

function RecipeForm() {
    const { id } = useParams()
    const isEdit = id !== undefined

    const [form, setForm] = useState({ title: '', image: '', source_url: '', instructions: '', servings: '' })
    const [ingredients, setIngredients] = useState<IngredientRow[]>(() => [newRow()])
    const [loading, setLoading] = useState(isEdit)
    const [saving, setSaving] = useState(false)
    const [titleError, setTitleError] = useState(false)

    const navigate = useNavigate()

    useEffect(() => {
        if (!isEdit) return

        const fetchRecipes = async () => {
            try {
                const recipe = await getRecipe(Number(id))
                setForm({
                    title: recipe.title,
                    image: recipe.image,
                    source_url: recipe.source_url,
                    instructions: recipe.instructions,
                    servings: recipe.servings > 0 ? String(recipe.servings) : '',
                })

                const rows = (recipe.ingredients ?? []).map(ing => newRow({
                    name: ing.name,
                    amount: ing.amount > 0 ? String(ing.amount) : '',
                    unit: ing.unit,
                }))
                setIngredients(rows.length > 0 ? rows : [newRow()])
            } catch (err) {
                toast.error('Could not load that recipe')
            } finally {
                setLoading(false)
            }
        }

        fetchRecipes()
    }, [id, isEdit, navigate])

    const updateField = (field: keyof typeof form, value: string) => {
        if (field === 'title' && value.trim()) setTitleError(false)
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const servings = parseInt(form.servings) || 0
    const setServings = (value: number) => updateField('servings', String(Math.max(0, value)))

    const updateIngredient = (index: number, field: 'name' | 'amount' | 'unit', value: string) =>
        setIngredients(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))

    const insertRow = (afterIndex: number) =>
        setIngredients(prev => [...prev.slice(0, afterIndex + 1), newRow(), ...prev.slice(afterIndex + 1)])

    const removeRow = (index: number) =>
        setIngredients(prev => prev.length === 1 ? [newRow()] : prev.filter((_, i) => i !== index))

    const filled = ingredients.filter(row => row.name.trim() !== '')

    const handleSubmit = async () => {
        if (!form.title.trim()) {
            setTitleError(true)
            return
        }

        const payload: RecipeInput = {
            title: form.title.trim(),
            image: form.image.trim(),
            source_url: form.source_url.trim(),
            instructions: form.instructions,
            servings: parseInt(form.servings) || 0,
            ingredients: filled.map(row => ({
                name: row.name.trim(),
                amount: parseFloat(row.amount) || 0,
                unit: row.unit.trim(),
            })),
        }

        setSaving(true)
        try {
            if (isEdit) {
                await updateRecipe(Number(id), payload)
                toast.success('Recipe updated')
                navigate(`/recipes/${id}`)
            } else {
                await createRecipe(payload)
                toast.success('Recipe added')
                navigate('/recipes')
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error ?? 'Failed to save recipe')
        } finally {
            setSaving(false)
        }
    }

    const cancel = () => navigate('/recipes')
    const heading = isEdit ? 'Edit recipe' : 'New recipe'

    const mobileTopBar = (
        <div className="sticky top-0 z-10 grid grid-cols-[80px_1fr_80px] items-center bg-white border-b border-stone-100 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-2.5">
            <button
                onClick={cancel}
                className={`min-h-11 px-2 text-left text-base text-stone-500 rounded-lg ${focusRing}`}
            >
                Cancel
            </button>
            <span className="text-center text-[17px] font-bold">{heading}</span>
            <button
                onClick={handleSubmit}
                disabled={saving || loading}
                className={`min-h-11 px-2 text-right text-base font-bold text-orange-700 rounded-lg disabled:opacity-55 ${focusRing}`}
            >
                {saving ? 'Saving…' : 'Save'}
            </button>
        </div>
    )

    if (loading) return (
        <>
            <div className="md:hidden">{mobileTopBar}</div>
            <RecipeFormSkeleton />
        </>
    )

    const ingredientCount = filled.length
    const meta = [
        ingredientCount === 0 ? 'No ingredients' : `${ingredientCount} ingredient${ingredientCount === 1 ? '' : 's'}`,
        servings > 0 && `${servings} serving${servings === 1 ? '' : 's'}`,
    ].filter(Boolean).join(' · ')

    const titleErrorText = titleError && (
        <span className="text-[13px] text-red-600">Title is required</span>
    )

    return (
        <>
            {/* Desktop: form + live preview */}
            <div className="hidden md:grid grid-cols-[minmax(0,620px)_300px] gap-12 items-start pb-3">
                <div className="flex flex-col gap-[26px]">
                    <p className="text-sm text-stone-500">
                        Only a title is required. Add ingredients if you want them on your shopping list.
                    </p>

                    <Field label="Title" htmlFor="recipe-title">
                        <input
                            id="recipe-title"
                            type="text"
                            placeholder="e.g. Grandma's lasagna"
                            value={form.title}
                            onChange={e => updateField('title', e.target.value)}
                            aria-invalid={titleError}
                            className={`w-full min-w-0 border rounded-xl px-4 py-3 text-xl font-semibold text-stone-900 outline-none transition-colors focus:border-orange-400 ${titleError ? 'border-red-400' : 'border-stone-200'}`}
                        />
                        {titleErrorText}
                    </Field>

                    <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-4">
                        <Field label="Servings" htmlFor="recipe-servings">
                            <div className="flex items-center border border-stone-200 rounded-[10px] overflow-hidden transition-colors focus-within:border-orange-400">
                                <StepperButton label="Fewer servings" onClick={() => setServings(servings - 1)}>−</StepperButton>
                                <input
                                    id="recipe-servings"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={form.servings}
                                    onChange={e => updateField('servings', e.target.value.replace(/\D/g, ''))}
                                    className="flex-1 w-full min-w-0 text-center text-[15px] font-semibold text-stone-900 outline-none"
                                />
                                <StepperButton label="More servings" onClick={() => setServings(servings + 1)}>+</StepperButton>
                            </div>
                        </Field>

                        <Field label="Source link" htmlFor="recipe-source" optional>
                            <input
                                id="recipe-source"
                                type="text"
                                placeholder="https://..."
                                value={form.source_url}
                                onChange={e => updateField('source_url', e.target.value)}
                                className={inputClasses}
                            />
                        </Field>
                    </div>

                    <Field label="Image URL" htmlFor="recipe-image" optional>
                        <input
                            id="recipe-image"
                            type="text"
                            placeholder="https://..."
                            value={form.image}
                            onChange={e => updateField('image', e.target.value)}
                            className={inputClasses}
                        />
                    </Field>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold">
                                Ingredients <span className="font-medium text-stone-400">{ingredientCount}</span>
                            </span>
                            <span className="text-[13px] text-stone-400">Added to your shopping list</span>
                        </div>
                        <IngredientsTable
                            rows={ingredients}
                            onChange={updateIngredient}
                            onInsert={insertRow}
                            onRemove={removeRow}
                        />
                    </div>

                    <Field label="Instructions" htmlFor="recipe-instructions" optional>
                        <textarea
                            id="recipe-instructions"
                            rows={6}
                            placeholder="How do you make it?"
                            value={form.instructions}
                            onChange={e => updateField('instructions', e.target.value)}
                            className={`${inputClasses} resize-y leading-normal`}
                        />
                    </Field>

                    <div className="flex items-center gap-2.5 pt-5 border-t border-stone-100">
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className={`bg-orange-500 hover:bg-orange-600 text-white text-[15px] font-semibold px-[22px] py-[11px] rounded-[10px] transition-colors disabled:opacity-55 ${focusRing}`}
                        >
                            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add recipe'}
                        </button>
                        <button
                            onClick={cancel}
                            className={`text-[15px] text-stone-500 hover:text-stone-900 hover:bg-stone-100 px-4 py-[11px] rounded-[10px] transition-colors ${focusRing}`}
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                <div className="sticky top-0 flex flex-col gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-[0.06em] text-stone-400">Preview</span>
                    <div className="border border-orange-200 rounded-[20px] overflow-hidden bg-white">
                        <RecipeThumb src={form.image.trim()} stripe={8} className="w-full h-[170px]" />
                        <div className="flex flex-col gap-2.5 px-5 pt-[18px] pb-5">
                            <span className={`text-[21px] font-bold tracking-[-0.01em] leading-[1.2] break-words ${form.title.trim() ? 'text-stone-900' : 'text-stone-400'}`}>
                                {form.title.trim() || 'Untitled recipe'}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 text-[13px] text-stone-600">
                                <span className="bg-orange-100 text-orange-700 rounded-full px-[9px] py-0.5 text-xs font-medium">my recipe</span>
                                <span>{meta}</span>
                            </div>
                        </div>
                    </div>
                    <span className="text-[13px] text-stone-500 text-pretty">
                        This is how it shows up in your meal plan and with "Use my own".
                    </span>
                </div>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex flex-col">
                {mobileTopBar}

                <RecipeThumb src={form.image.trim()} stripe={8} className="w-full h-[150px] flex-none" />

                <div className="flex flex-col gap-5 px-5 pt-[18px] pb-[max(28px,env(safe-area-inset-bottom))]">
                    <div className="flex flex-col gap-1.5">
                        <input
                            type="text"
                            aria-label="Recipe title"
                            placeholder="Recipe title"
                            value={form.title}
                            onChange={e => updateField('title', e.target.value)}
                            aria-invalid={titleError}
                            className={`w-full min-w-0 border-b-[1.5px] py-2 text-2xl font-bold text-stone-900 outline-none transition-colors focus:border-orange-400 ${titleError ? 'border-red-400' : 'border-stone-200'}`}
                        />
                        {titleErrorText}
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-[15px] font-semibold">Servings</span>
                        <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-[3px]">
                            <button
                                onClick={() => setServings(servings - 1)}
                                aria-label="Fewer servings"
                                className={`w-11 h-11 rounded-[9px] bg-white text-xl text-stone-600 ${focusRing}`}
                            >
                                −
                            </button>
                            <span className="w-10 text-center text-[17px] font-bold">{servings}</span>
                            <button
                                onClick={() => setServings(servings + 1)}
                                aria-label="More servings"
                                className={`w-11 h-11 rounded-[9px] bg-white text-xl text-stone-600 ${focusRing}`}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <span className="text-[15px] font-semibold">
                            Ingredients <span className="font-medium text-stone-400">{ingredientCount}</span>
                        </span>
                        <IngredientsTable
                            compact
                            rows={ingredients}
                            onChange={updateIngredient}
                            onInsert={insertRow}
                            onRemove={removeRow}
                        />
                    </div>

                    <Field label="Instructions" htmlFor="recipe-instructions-m" mobile>
                        <textarea
                            id="recipe-instructions-m"
                            rows={5}
                            placeholder="Optional. How do you make it?"
                            value={form.instructions}
                            onChange={e => updateField('instructions', e.target.value)}
                            className={`${inputClasses} text-base resize-y leading-normal`}
                        />
                    </Field>

                    <Field label="Image URL" htmlFor="recipe-image-m" mobile>
                        <input
                            id="recipe-image-m"
                            type="text"
                            placeholder="https://... (optional)"
                            value={form.image}
                            onChange={e => updateField('image', e.target.value)}
                            className={`${inputClasses} text-base min-h-11`}
                        />
                    </Field>

                    <Field label="Source link" htmlFor="recipe-source-m" mobile>
                        <input
                            id="recipe-source-m"
                            type="text"
                            placeholder="https://... (optional)"
                            value={form.source_url}
                            onChange={e => updateField('source_url', e.target.value)}
                            className={`${inputClasses} text-base min-h-11`}
                        />
                    </Field>
                </div>
            </div>
        </>
    )
}

type FieldProps = {
    label: string
    htmlFor: string
    optional?: boolean
    mobile?: boolean
    children: React.ReactNode
}

function Field({ label, htmlFor, optional, mobile, children }: FieldProps) {
    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={htmlFor} className={`${mobile ? 'text-[15px]' : 'text-sm'} font-semibold text-stone-900`}>
                {label}
                {optional && <span className="font-normal text-stone-400"> optional</span>}
            </label>
            {children}
        </div>
    )
}

function StepperButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            className={`w-[42px] h-[42px] flex-none bg-stone-50 hover:bg-orange-50 text-lg text-stone-600 transition-colors ${focusRing}`}
        >
            {children}
        </button>
    )
}

type IngredientsTableProps = {
    rows: IngredientRow[]
    compact?: boolean
    onChange: (index: number, field: 'name' | 'amount' | 'unit', value: string) => void
    onInsert: (afterIndex: number) => void
    onRemove: (index: number) => void
}

function IngredientsTable({ rows, compact, onChange, onInsert, onRemove }: IngredientsTableProps) {
    const nameRefs = useRef(new Map<number, HTMLInputElement>())
    const pendingFocus = useRef<number | null>(null)

    // Focus the name input of a row this table just added
    useEffect(() => {
        if (pendingFocus.current === null) return
        nameRefs.current.get(rows[pendingFocus.current]?.id)?.focus()
        pendingFocus.current = null
    }, [rows])

    const addAfter = (index: number) => {
        pendingFocus.current = index + 1
        onInsert(index)
    }

    const columns = `grid ${compact ? 'grid-cols-[minmax(0,1fr)_64px_56px_40px]' : 'grid-cols-[minmax(0,1fr)_96px_96px_40px]'}`
    const cellPad = compact ? 'px-2.5' : 'px-3.5'
    const cell = `min-w-0 self-stretch bg-transparent py-[11px] ${compact ? 'text-base' : 'text-[15px]'} text-stone-900 outline-none transition-colors focus:bg-orange-50`

    const onKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        addAfter(index)
    }

    return (
        <div className="border border-stone-200 rounded-[14px] overflow-hidden bg-white">
            <div className={`${columns} py-2 bg-stone-50 text-xs font-semibold uppercase tracking-[0.04em] text-stone-500`}>
                <span className="pl-3.5">Ingredient</span>
                <span className={compact ? 'pl-2.5' : 'pl-3.5'}>{compact ? 'Amt' : 'Amount'}</span>
                <span className={compact ? 'pl-2.5' : 'pl-3.5'}>Unit</span>
                <span />
            </div>

            {rows.map((row, index) => (
                <div
                    key={row.id}
                    className={`${columns} items-center border-t border-stone-100 ${compact ? 'min-h-12' : 'min-h-11'}`}
                >
                    <input
                        ref={el => { if (el) nameRefs.current.set(row.id, el); else nameRefs.current.delete(row.id) }}
                        type="text"
                        aria-label={`Ingredient ${index + 1}`}
                        placeholder="Ingredient"
                        value={row.name}
                        onChange={e => onChange(index, 'name', e.target.value)}
                        onKeyDown={onKeyDown(index)}
                        className={`${cell} px-3.5`}
                    />
                    <input
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        aria-label={`Amount for ingredient ${index + 1}`}
                        placeholder="—"
                        value={row.amount}
                        onChange={e => onChange(index, 'amount', e.target.value)}
                        onKeyDown={onKeyDown(index)}
                        className={`${cell} ${cellPad} border-l border-stone-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                    />
                    <input
                        type="text"
                        aria-label={`Unit for ingredient ${index + 1}`}
                        placeholder="—"
                        value={row.unit}
                        onChange={e => onChange(index, 'unit', e.target.value)}
                        onKeyDown={onKeyDown(index)}
                        className={`${cell} ${cellPad} border-l border-stone-100`}
                    />
                    <button
                        onClick={() => onRemove(index)}
                        aria-label={`Remove ingredient ${index + 1}`}
                        className={`h-full min-h-11 text-lg text-stone-300 hover:text-red-600 transition-colors ${focusRing}`}
                    >
                        ×
                    </button>
                </div>
            ))}

            <button
                onClick={() => addAfter(rows.length - 1)}
                className={`flex w-full min-h-11 px-3.5 py-3 border-t border-stone-100 text-sm font-semibold text-orange-700 text-left hover:bg-orange-50 transition-colors ${focusRing}`}
            >
                + Add ingredient
            </button>
        </div>
    )
}

function RecipeFormSkeleton() {
    const label = <div className="h-3 w-20 rounded-md bg-stone-100" />

    return (
        <div className="animate-pulse">
            <div className="hidden md:grid grid-cols-[minmax(0,620px)_300px] gap-12 items-start">
                <div className="flex flex-col gap-[26px]">
                    <div className="h-3 w-[70%] rounded-md bg-stone-50" />
                    <div className="flex flex-col gap-2">{label}<div className="h-[54px] rounded-xl bg-stone-100" /></div>
                    <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-4">
                        <div className="flex flex-col gap-2">{label}<div className="h-11 rounded-[10px] bg-stone-100" /></div>
                        <div className="flex flex-col gap-2">{label}<div className="h-11 rounded-[10px] bg-stone-100" /></div>
                    </div>
                    <div className="flex flex-col gap-2">{label}<div className="h-11 rounded-[10px] bg-stone-100" /></div>
                    <div className="flex flex-col gap-2">
                        {label}
                        <div className="border border-stone-200 rounded-[14px] overflow-hidden">
                            <div className="h-8 bg-stone-50" />
                            {[60, 45, 70].map((w, i) => (
                                <div key={i} className="flex items-center h-11 px-3.5 border-t border-stone-100">
                                    <div className="h-[11px] rounded-md bg-stone-100" style={{ width: `${w}%` }} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">{label}<div className="h-[150px] rounded-[10px] bg-stone-100" /></div>
                </div>

                <div className="flex flex-col gap-2.5">
                    <div className="h-3 w-16 rounded-md bg-stone-100" />
                    <div className="border border-orange-200 rounded-[20px] overflow-hidden">
                        <div className="h-[170px] bg-stone-50" />
                        <div className="flex flex-col gap-2.5 px-5 pt-[18px] pb-5">
                            <div className="h-5 w-[70%] rounded-md bg-stone-100" />
                            <div className="h-3 w-1/2 rounded-md bg-stone-50" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="md:hidden flex flex-col">
                <div className="h-[150px] bg-stone-50" />
                <div className="flex flex-col gap-5 px-5 pt-[18px]">
                    <div className="h-10 w-[70%] rounded-md bg-stone-100" />
                    <div className="h-12 rounded-xl bg-stone-100" />
                    <div className="h-[180px] rounded-[14px] bg-stone-100" />
                    <div className="h-[120px] rounded-[10px] bg-stone-100" />
                </div>
            </div>
        </div>
    )
}

export default RecipeForm
