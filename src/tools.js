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
        // NOTE: Mealie API search endpoint paths can differ by version.
        // We use /api/recipes with 'search' param for your instance.
        const res = await http.get("/api/recipes", {
          params: {
            search: query,
            limit,
            tags: tags.join(",")
          }
        });

        const items = res.data.items || res.data.results || res.data || [];
        const mapped = items.map((r) => ({
          id: String(r.id || r._id || r.slug || r.recipeId || r.uuid || ""),
          title: r.name || r.title || "Untitled",
          summary: r.description || r.summary || "",
          tags: r.tags || r.categories || [],
          url: `${http.defaults.baseURL}/recipe/${r.slug || r.id || ""}`
        }));

        return { results: mapped };
      } catch (err) {
        // Improved error propagation for MCP clients
        const msg = normalizeError(err);
        const e = new Error(msg);
        e.code = "MEALIE_HTTP_ERROR";
        throw e;
      }
    }
  },

  get_recipe_by_id: {
    name: "get_recipe_by_id",
    description: "Fetch a full recipe by ID.",
    inputSchema: getRecipeInput,
    outputSchema: getRecipeOutput,
    handler: async (args) => {
      validate(getRecipeInput, args);
      const { id } = args;

      try {
        const res = await http.get(`/api/recipes/${id}`);
        const data = res.data;

        const ingredients = (
          data.recipeIngredient // common array of strings
          || (data.ingredients || []).map(i => i.note || i.text || i.name || "")
          || []
        );

        const instructions = (
          data.recipeInstructions // common array of strings or objects
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
          url: `${http.defaults.baseURL}/recipe/${data.slug || id}`
        };
      } catch (err) {
        // Improved error propagation for MCP clients
        const msg = normalizeError(err);
        const e = new Error(msg);
        e.code = "MEALIE_HTTP_ERROR";
        throw e;
      }
    }
  }
};
