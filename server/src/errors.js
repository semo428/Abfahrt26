'use strict';
// Fehler mit HTTP-Status und Code; der Client bekommt nur { error: code }.
class ApiError extends Error {
  constructor(status, code){ super(code); this.status = status; this.code = code; }
}
module.exports = { ApiError };
