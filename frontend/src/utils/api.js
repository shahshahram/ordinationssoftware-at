"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.apiRequest = void 0;
// Dynamische API-URL basierend auf dem aktuellen Hostname
var getApiBaseUrl = function () {
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    // Verwende den aktuellen Hostname statt localhost, damit es auch im Netzwerk funktioniert
    var hostname = window.location.hostname;
    return "http://".concat(hostname, ":5001/api");
};
var API_BASE_URL = getApiBaseUrl();
// Removed unused ApiError interface
var ApiClient = /** @class */ (function () {
    function ApiClient(baseURL) {
        this.baseURL = baseURL;
    }
    ApiClient.prototype.request = function (endpoint, method, data, headers) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (method === void 0) { method = 'GET'; }
        if (headers === void 0) { headers = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var url, token, defaultHeaders, config, controller_1, timeoutId, response, fetchError_1, networkError, refreshToken, refreshResponse, refreshData, newHeaders, retryConfig, retryResponse, errorData_1, result_1, refreshError_1, isNetworkError, errorData, error, result, error_1, isNetworkError, networkError;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        url = "".concat(this.baseURL).concat(endpoint);
                        token = localStorage.getItem('token');
                        defaultHeaders = __assign({ 'Content-Type': 'application/json' }, headers);
                        if (token) {
                            defaultHeaders.Authorization = "Bearer ".concat(token);
                            console.log('API Request with token:', {
                                url: url,
                                method: method,
                                hasToken: !!token,
                                tokenLength: token.length,
                                tokenStart: token.substring(0, 20) + '...',
                                headers: defaultHeaders
                            });
                        }
                        else {
                            console.log('API Request without token:', { url: url, method: method });
                        }
                        config = {
                            method: method,
                            headers: defaultHeaders
                        };
                        if (data && method !== 'GET') {
                            // Wenn data eine FormData-Instanz ist, nicht stringify und Content-Type nicht setzen
                            if (data instanceof FormData) {
                                config.body = data;
                                // Entferne Content-Type Header für FormData, Browser setzt es automatisch mit Boundary
                                delete config.headers['Content-Type'];
                            }
                            else {
                                config.body = JSON.stringify(data);
                            }
                        }
                        _j.label = 1;
                    case 1:
                        _j.trys.push([1, 22, , 23]);
                        console.log('Sending fetch request to:', url);
                        console.log('Request config:', config);
                        console.log('Request body:', data ? JSON.stringify(data, null, 2) : 'No body');
                        controller_1 = new AbortController();
                        timeoutId = setTimeout(function () { return controller_1.abort(); }, 30000);
                        response = void 0;
                        _j.label = 2;
                    case 2:
                        _j.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, fetch(url, __assign(__assign({}, config), { signal: controller_1.signal }))];
                    case 3:
                        response = _j.sent();
                        clearTimeout(timeoutId);
                        return [3 /*break*/, 5];
                    case 4:
                        fetchError_1 = _j.sent();
                        clearTimeout(timeoutId);
                        // Wenn der Request abgebrochen wurde (Timeout), werfe einen Netzwerkfehler
                        if ((fetchError_1 === null || fetchError_1 === void 0 ? void 0 : fetchError_1.name) === 'AbortError' || controller_1.signal.aborted) {
                            networkError = new Error('Netzwerkfehler: Request-Timeout. Bitte versuchen Sie es erneut.');
                            networkError.isNetworkError = true;
                            networkError.isTimeout = true;
                            throw networkError;
                        }
                        throw fetchError_1;
                    case 5:
                        console.log('Received response:', response.status, response.statusText);
                        if (!!response.ok) return [3 /*break*/, 20];
                        if (!(response.status === 401)) return [3 /*break*/, 18];
                        console.log('Token expired, attempting to refresh...');
                        refreshToken = localStorage.getItem('refreshToken');
                        if (!refreshToken) return [3 /*break*/, 17];
                        _j.label = 6;
                    case 6:
                        _j.trys.push([6, 15, , 16]);
                        return [4 /*yield*/, fetch("".concat(this.baseURL.replace('/api', ''), "/api/auth/refresh"), {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ refreshToken: refreshToken })
                            })];
                    case 7:
                        refreshResponse = _j.sent();
                        if (!refreshResponse.ok) return [3 /*break*/, 13];
                        return [4 /*yield*/, refreshResponse.json()];
                    case 8:
                        refreshData = _j.sent();
                        console.log('Token refresh successful:', refreshData);
                        localStorage.setItem('token', refreshData.token);
                        localStorage.setItem('refreshToken', refreshData.refreshToken);
                        newHeaders = __assign(__assign({}, defaultHeaders), { Authorization: "Bearer ".concat(refreshData.token) });
                        retryConfig = {
                            method: method,
                            headers: newHeaders
                        };
                        if (data && method !== 'GET') {
                            retryConfig.body = JSON.stringify(data);
                        }
                        console.log('Retrying original request with new token...');
                        return [4 /*yield*/, fetch(url, retryConfig)];
                    case 9:
                        retryResponse = _j.sent();
                        if (!!retryResponse.ok) return [3 /*break*/, 11];
                        return [4 /*yield*/, retryResponse.json()["catch"](function () { return ({}); })];
                    case 10:
                        errorData_1 = _j.sent();
                        console.error('Retry request failed:', retryResponse.status, errorData_1);
                        throw new Error(errorData_1.message || "HTTP error! status: ".concat(retryResponse.status));
                    case 11: return [4 /*yield*/, retryResponse.json()];
                    case 12:
                        result_1 = _j.sent();
                        console.log('Retry request successful:', result_1);
                        return [2 /*return*/, result_1];
                    case 13:
                        // Refresh failed, redirect to login
                        localStorage.removeItem('token');
                        localStorage.removeItem('refreshToken');
                        window.location.href = '/login';
                        throw new Error('Session expired. Please login again.');
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        refreshError_1 = _j.sent();
                        console.error('Token refresh failed:', refreshError_1);
                        isNetworkError = (refreshError_1 === null || refreshError_1 === void 0 ? void 0 : refreshError_1.name) === 'TypeError' &&
                            (((_a = refreshError_1 === null || refreshError_1 === void 0 ? void 0 : refreshError_1.message) === null || _a === void 0 ? void 0 : _a.includes('Failed to fetch')) ||
                                ((_b = refreshError_1 === null || refreshError_1 === void 0 ? void 0 : refreshError_1.message) === null || _b === void 0 ? void 0 : _b.includes('NetworkError')) ||
                                ((_c = refreshError_1 === null || refreshError_1 === void 0 ? void 0 : refreshError_1.message) === null || _c === void 0 ? void 0 : _c.includes('ERR_CONNECTION_RESET')));
                        // Bei Netzwerkfehlern: Nicht abmelden, nur Fehler werfen
                        if (isNetworkError) {
                            console.warn('Token-Refresh fehlgeschlagen wegen Netzwerkfehler - Benutzer wird nicht abgemeldet');
                            throw new Error('Netzwerkfehler: Verbindung zum Server konnte nicht hergestellt werden. Bitte versuchen Sie es erneut.');
                        }
                        // Bei echten Authentifizierungsfehlern: Abmelden
                        localStorage.removeItem('token');
                        localStorage.removeItem('refreshToken');
                        window.location.href = '/login';
                        throw new Error('Session expired. Please login again.');
                    case 16: return [3 /*break*/, 18];
                    case 17:
                        // No refresh token, redirect to login
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                        throw new Error('Session expired. Please login again.');
                    case 18: return [4 /*yield*/, response.json()["catch"](function () { return ({}); })];
                    case 19:
                        errorData = _j.sent();
                        error = new Error(errorData.message || "HTTP error! status: ".concat(response.status));
                        error.response = { data: errorData, status: response.status };
                        throw error;
                    case 20: return [4 /*yield*/, response.json()];
                    case 21:
                        result = _j.sent();
                        console.log('API response data:', result);
                        // Return the data wrapped in ApiResponse structure
                        return [2 /*return*/, {
                                data: result,
                                success: result.success,
                                message: result.message
                            }];
                    case 22:
                        error_1 = _j.sent();
                        console.error('API request failed:', error_1);
                        console.error('Error details:', {
                            name: (error_1 === null || error_1 === void 0 ? void 0 : error_1.name) || 'Unknown',
                            message: (error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || 'Unknown error',
                            stack: (error_1 === null || error_1 === void 0 ? void 0 : error_1.stack) || 'No stack trace'
                        });
                        isNetworkError = (error_1 === null || error_1 === void 0 ? void 0 : error_1.isNetworkError) === true ||
                            (error_1 === null || error_1 === void 0 ? void 0 : error_1.isTimeout) === true ||
                            (error_1 === null || error_1 === void 0 ? void 0 : error_1.name) === 'AbortError' ||
                            ((error_1 === null || error_1 === void 0 ? void 0 : error_1.name) === 'TypeError' &&
                                (((_d = error_1 === null || error_1 === void 0 ? void 0 : error_1.message) === null || _d === void 0 ? void 0 : _d.includes('Failed to fetch')) ||
                                    ((_e = error_1 === null || error_1 === void 0 ? void 0 : error_1.message) === null || _e === void 0 ? void 0 : _e.includes('NetworkError')) ||
                                    ((_f = error_1 === null || error_1 === void 0 ? void 0 : error_1.message) === null || _f === void 0 ? void 0 : _f.includes('ERR_CONNECTION_RESET')) ||
                                    ((_g = error_1 === null || error_1 === void 0 ? void 0 : error_1.message) === null || _g === void 0 ? void 0 : _g.includes('aborted')) ||
                                    ((_h = error_1 === null || error_1 === void 0 ? void 0 : error_1.message) === null || _h === void 0 ? void 0 : _h.includes('Request-Timeout'))));
                        // Bei Netzwerkfehlern: Fehler weiterwerfen, aber NICHT abmelden
                        // Nur bei echten Authentifizierungsfehlern (401) wird abgemeldet
                        if (isNetworkError) {
                            console.warn('Netzwerkfehler erkannt - Benutzer wird nicht abgemeldet:', error_1.message);
                            networkError = new Error("Netzwerkfehler: ".concat(error_1.message));
                            networkError.isNetworkError = true;
                            networkError.originalError = error_1;
                            throw networkError;
                        }
                        // Bei anderen Fehlern: Normal weiterwerfen
                        throw error_1;
                    case 23: return [2 /*return*/];
                }
            });
        });
    };
    ApiClient.prototype.get = function (endpoint, params, headers) {
        return __awaiter(this, void 0, void 0, function () {
            var url, searchParams_1, queryString;
            return __generator(this, function (_a) {
                url = endpoint;
                if (params) {
                    searchParams_1 = new URLSearchParams();
                    Object.keys(params).forEach(function (key) {
                        var value = params[key];
                        if (Array.isArray(value)) {
                            value.forEach(function (v) { return searchParams_1.append(key, String(v)); });
                        }
                        else if (value !== undefined && value !== null) {
                            searchParams_1.append(key, String(value));
                        }
                    });
                    queryString = searchParams_1.toString();
                    if (queryString) {
                        url += (endpoint.includes('?') ? '&' : '?') + queryString;
                    }
                }
                return [2 /*return*/, this.request(url, 'GET', undefined, headers)];
            });
        });
    };
    ApiClient.prototype.post = function (endpoint, data, headers) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.request(endpoint, 'POST', data, headers)];
            });
        });
    };
    ApiClient.prototype.put = function (endpoint, data, headers) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.request(endpoint, 'PUT', data, headers)];
            });
        });
    };
    ApiClient.prototype["delete"] = function (endpoint, headers) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.request(endpoint, 'DELETE', undefined, headers)];
            });
        });
    };
    return ApiClient;
}());
var apiClient = new ApiClient(API_BASE_URL);
exports.apiRequest = {
    get: function (endpoint, params, headers) { return apiClient.get(endpoint, params, headers); },
    post: function (endpoint, data, headers) { return apiClient.post(endpoint, data, headers); },
    put: function (endpoint, data, headers) { return apiClient.put(endpoint, data, headers); },
    "delete": function (endpoint, headers) { return apiClient["delete"](endpoint, headers); }
};
exports["default"] = apiClient;
