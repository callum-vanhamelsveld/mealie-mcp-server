// JSON Schemas (draft-07 compatible) for tool inputs/outputs

export const searchRecipesInput = {
  type: "object",
  properties: {
    query: { type: "string", minLength: 1 },
    limit: { type: "integer", minimum: 1, maximum: 50 },
    tags: { type: "array", items: { type: "string" } }
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
    id: { type: "string", minLength: 1 }
  },
  required: ["id"],
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
    url: { type: "string" }
  },
  required: ["id", "title"],
  additionalProperties: false
};
