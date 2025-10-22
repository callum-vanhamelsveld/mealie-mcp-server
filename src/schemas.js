// JSON Schemas (draft-07 compatible) for tool inputs/outputs

export const searchRecipesInput = {
  type: "object",
  properties: {
    query: { type: "string", minLength: 1 },

    // Backward-compatible "limit" (we'll map it to perPage in code)
    limit: { type: "integer", minimum: 1, maximum: 100 },

    // Preferred explicit page size for Mealie
    perPage: { type: "integer", minimum: 1, maximum: 100 },

    // Pagination page number (1-based)
    page: { type: "integer", minimum: 1 },

    // Tag filters
    tags: { type: "array", items: { type: "string" } },

    // Tag matching mode: true = AND (all tags must match), false = OR (any tag)
    requireAllTags: { type: "boolean" }
  },
  required: ["query"],
  additionalProperties: false
};

export const searchRecipesOutput = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          slug: { type: "string" },
          url: { type: "string" }
        },
        required: ["id", "title"]
      }
    }
  },
  required: ["results"],
  additionalProperties: false
};

export const getRecipeInput = {
  type: "object",
  properties: {
    id: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 }
  },
  oneOf: [
    { required: ["id"] },
    { required: ["slug"] }
  ],
  additionalProperties: false
};

export const getRecipeOutput = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    ingredients: { type: "array", items: { type: "string" } },
    instructions: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    slug: { type: "string" },
    url: { type: "string" }
  },
  required: ["id", "title"],
  additionalProperties: false
};