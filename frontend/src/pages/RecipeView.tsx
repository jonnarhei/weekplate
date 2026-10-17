import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { deleteRecipe, getRecipe } from "../api/recipes";
import type { UserRecipe, UserRecipeIngredient } from "../api/types";
import { useAppLayout } from "../components/AppLayout";
import RecipeThumb from "../components/RecipeThumb";
import EmptyState from "../components/EmptyState";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"

const quantity = (ingredient: UserRecipeIngredient) =>
  [ingredient.amount > 0 && ingredient.amount, ingredient.unit].filter(Boolean).join(' ')

function RecipeView() {
  const { id } = useParams()
  const { setCrumb } = useAppLayout()

  const [recipe, setRecipe] = useState<UserRecipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    const fetchRecipe = async () => {
      setLoading(true)
      try {
        setRecipe(await getRecipe(Number(id)))
      } catch (err) {
        toast.error('Could not load that recipe')
        setRecipe(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRecipe()
  }, [id])

  useEffect(() => {
    setCrumb(recipe?.title ?? null)
    return () => setCrumb(null)
  }, [recipe, setCrumb])

  const handleDelete = async () => {
    if (!recipe || !window.confirm(`Delete "${recipe.title}"?`)) return

    setDeleting(true)
    try {
      await deleteRecipe(recipe.id)
      toast.success('Recipe deleted')
      navigate('/recipes')
    } catch (err) {
      toast.error('Failed to delete recipe')
      setDeleting(false)
    }
  }

  if (loading) return <RecipeViewSkeleton />

  if (!recipe) return (
    <div className="px-5 pt-7 md:p-0">
      <EmptyState
        visual={<RecipeThumb stripe={6} className="w-[72px] h-[72px] rounded-2xl" />}
        title="Recipe not found"
        description="It may have been deleted, or the link is wrong."
        actionLabel="Back to recipes"
        onAction={() => navigate('/recipes')}
      />
    </div>
  )

  const ingredients = [...(recipe.ingredients ?? [])].sort((a, b) => a.position - b.position)
  const count = ingredients.length
  const meta = [
    count === 0 ? 'No ingredients' : `${count} ingredient${count === 1 ? '' : 's'}`,
    recipe.servings > 0 && `${recipe.servings} serving${recipe.servings === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' · ')
  const instructions = recipe.instructions.trim()

  const metaRow = (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-stone-600">
      <span className="bg-orange-100 text-orange-700 rounded-full px-2.5 py-0.5 text-[13px] font-medium">
        my recipe
      </span>
      <span>{meta}</span>
      {recipe.source_url && (
        <a
          href={recipe.source_url}
          target="_blank"
          rel="noreferrer"
          className={`font-semibold text-orange-700 hover:text-orange-800 rounded-md transition-colors ${focusRing}`}
        >
          Original recipe ↗
        </a>
      )}
    </div>
  )

  const ingredientsSection = (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-bold">
        Ingredients <span className="font-medium text-stone-400">{count}</span>
      </h2>
      {count === 0 ? (
        <p className="text-sm text-stone-500">No ingredients added.</p>
      ) : (
        <ul className="flex flex-col">
          {ingredients.map(ingredient => (
            <li
              key={ingredient.id}
              className="flex items-baseline justify-between gap-4 py-2.5 border-b border-stone-100 last:border-b-0"
            >
              <span className="text-[15px] min-w-0 break-words">{ingredient.name}</span>
              <span className="flex-none text-sm text-stone-500">{quantity(ingredient)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  const instructionsSection = (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-bold">Instructions</h2>
      {instructions ? (
        <p className="text-[15px] leading-relaxed text-stone-700 whitespace-pre-line break-words">
          {instructions}
        </p>
      ) : (
        <p className="text-sm text-stone-500">No instructions added.</p>
      )}
    </section>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex max-w-[920px] flex-col gap-7 pb-3">
        <RecipeThumb
          src={recipe.image}
          alt={recipe.title}
          stripe={10}
          className="w-full h-[260px] rounded-[20px]"
        />

        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-3 min-w-0">
            <h1 className="text-[30px] font-bold tracking-[-0.01em] leading-[1.15] break-words">
              {recipe.title}
            </h1>
            {metaRow}
          </div>

          <div className="flex-none flex gap-2">
            <button
              onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
              className={`bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-[18px] py-2.5 rounded-[10px] transition-colors ${focusRing}`}
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`text-sm text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-[10px] transition-colors disabled:opacity-55 ${focusRing}`}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-10 pt-6 border-t border-stone-100">
          {ingredientsSection}
          {instructionsSection}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex flex-col">
        <div className="relative h-[260px]">
          <RecipeThumb
            src={recipe.image}
            alt={recipe.title}
            stripe={10}
            className="absolute inset-0 w-full h-full"
          />
          <button
            onClick={() => navigate('/recipes')}
            className={`absolute left-4 top-[max(24px,env(safe-area-inset-top))] min-h-11 bg-white rounded-full px-4 text-sm font-semibold text-stone-900 shadow-[0_1px_3px_rgba(0,0,0,0.1)] ${focusRing}`}
          >
            ‹ Recipes
          </button>
        </div>

        <div className="flex flex-col gap-6 px-5 pt-[22px] pb-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-[28px] font-bold tracking-[-0.01em] leading-[1.15] break-words">
              {recipe.title}
            </h1>
            {metaRow}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
              className={`bg-orange-500 hover:bg-orange-600 text-white text-[15px] font-semibold py-3.5 rounded-xl transition-colors ${focusRing}`}
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`bg-red-50 hover:bg-red-100 text-red-600 text-[15px] font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-55 ${focusRing}`}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>

          {ingredientsSection}
          {instructionsSection}
        </div>
      </div>
    </>
  )
}

function RecipeViewSkeleton() {
  const rows = [60, 45, 70, 50].map((w, i) => (
    <div key={i} className="flex items-center justify-between py-3 border-b border-stone-100">
      <div className="h-[11px] rounded-md bg-stone-100" style={{ width: `${w}%` }} />
      <div className="h-[11px] w-10 rounded-md bg-stone-50" />
    </div>
  ))

  return (
    <div className="animate-pulse">
      <div className="hidden md:flex max-w-[920px] flex-col gap-7">
        <div className="h-[260px] rounded-[20px] bg-stone-50" />
        <div className="flex flex-col gap-3">
          <div className="h-8 w-[55%] rounded-md bg-stone-100" />
          <div className="h-3.5 w-[30%] rounded-md bg-stone-50" />
        </div>
        <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-10 pt-6 border-t border-stone-100">
          <div className="flex flex-col">{rows}</div>
          <div className="flex flex-col gap-2.5">
            {[95, 90, 70, 85].map((w, i) => (
              <div key={i} className="h-[11px] rounded-md bg-stone-100" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="md:hidden flex flex-col">
        <div className="h-[260px] bg-stone-50" />
        <div className="flex flex-col gap-4 px-5 pt-[22px]">
          <div className="h-8 w-[70%] rounded-md bg-stone-100" />
          <div className="h-3.5 w-1/2 rounded-md bg-stone-50" />
          <div className="h-[50px] rounded-xl bg-stone-100" />
          <div className="flex flex-col">{rows}</div>
        </div>
      </div>
    </div>
  )
}

export default RecipeView
