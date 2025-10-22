import Ajv from "ajv";
import { http, normalizeError } from "./http.js";
import {
  searchRecipesInput,
  searchRecipesOutput,
  getRecipeInput,
  getRecipeOutput
} from "./schemas.js";

const ajv = new Ajv({ allErrors: true });

function validate(schema, payload) {
  const validateFn = ajv.compile(schema);
  const ok = validateFn(payload);
  if (!ok) {
    const msg = validateFn.errors?.map(e => `${e.instancePath} ${e.message}`).join("; ") || "Invalid payload";
    const err = new Error(msg);
    err.code = "VALIDATION_ERROR";
    throw err;
  }
}

export const tools = {
  search_recipes: {
    name: "search_recipes",
    description: "Search Mealie recipes by text query, with optional tags and limit.",
    inputSchema: searchRecipesInput,
    outputSchema: searchRecipesOutput,
    handler: async (args) => {
      validate(searchRecipesInput, args);
      const { query, limit = 10, tags = [] } = args;

      try {
        // Mealie expects: GET /api/recipes?search=&perPage=&tags=&tags=&requireAllTags=
        // Note: use perPage (not "limit"), and pass tags as an array (Axios will serialize repeated keys).
        const res = await http.get("/api/recipes", {
          params: {
            search: query,
            perPage: limit,
            // If you want AND behavior for tags, add: requireAllTags: true
            // For now we keep default OR behavior.
            ...(Array.isArray(tags) && tags.length > 0 ? { tags } : {})
          }
        });

        const body = res.data || {};
        const items = Array.isArray(body.items) ? body.items : (Array.isArray(body) ? body : []);
        const mapped = items.map((r) => ({
          id: String(r.id || r.slug || ""),
          title: r.name || r.title || "Untitled",
          summary: r.description || r.summary || "",
          // tags may be an array of objects {id,name,slug} in Mealie summaries
          tags: Array.isArray(r.tags)
            ? r.tags.map(t => (typeof t === "string" ? t : (t?.name || t?.slug || ""))).filter(Boolean)
            : [],
          url: `${http.defaults.baseURL.replace(/\/+$/, "")}/recipe/${r.slug || r.id || ""}`
        }));

        return { results: mapped };
      } catch (err) {
        const msg = normalizeError(err);
        // Log succinct tool error to stderr so AnythingLLM shows it
        try { console.error(JSON.stringify({ type: "tool_error", tool: "search_recipes", message: msg })); } catch {}
        const e = new Error(msg);
        e.code = "MEALIE_HTTP_ERROR";
        throw e;
      }
    }
  },

  get_recipe_by_id: {
    name: "get_recipe_by_id",
    description: "Fetch a full recipe by ID (or slug).",
    inputSchema: getRecipeInput,
    outputSchema: getRecipeOutput,
    handler: async (args) => {
      validate(getRecipeInput, args);
      const { id } = args;

      try {
        // Mealie detail: GET /api/recipes/{slug} where slug can be slug or UUID id
        const res = await http.get(`/api/recipes/${id}`);
        const data = res.data;

        const ingredients = (
          data.recipeIngredient
          || (data.ingredients || []).map(i => i.note || i.text || i.name || "")
          || []
        );

        const instructions = (
          data.recipeInstructions
            ? data.recipeInstructions.map(s => (typeof s === "string" ? s : (s.text || s.step || "")))
            : (data.steps || data.instructions || []).map(s => s.text || s.step || "")
        );

        const tags = (
          (data.tags || data.recipeCategory || []).map(t => {
            if (typeof t === "string") return t;
            return t?.name || t?.slug || "";
          }).filter(Boolean)
        );

        return {
          id: String(data.id || id),
          title: data.name || data.title || "Untitled",
          description: data.description || "",
          ingredients,
          instructions,
          tags,
          url: `${http.defaults.baseURL.replace(/\/+$/, "")}/recipe/${data.slug || id}`
        };
      } catch (err) {
        const msg = normalizeError(err);
        // Log succinct tool error to stderr so AnythingLLM shows it
        try { console.error(JSON.stringify({ type: "tool_error", tool: "get_recipe_by_id", message: msg })); } catch {}
        const e = new Error(msg);
        e.code = "MEALIE_HTTP_ERROR";
        throw e;
      }
    }
  }
};
