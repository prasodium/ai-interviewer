/** Thrown when the AI service could not be reached at all (network, auth, etc). */
export class AIRequestError extends Error {}

/** Thrown when the AI responded but its JSON could not be recovered into a usable shape. */
export class AIResponseError extends Error {}
