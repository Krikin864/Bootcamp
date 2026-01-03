"use strict";
/**
 * Script de prueba para verificar la conexión con Supabase
 *
 * Ejecutar con: npx tsx test-supabase.ts
 * O instalar tsx globalmente: npm install -g tsx
 */
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
// Intentar cargar variables de entorno desde .env.local
// Si dotenv no está instalado, asumimos que las variables ya están en process.env
try {
    var dotenv = require('dotenv');
    var path = require('path');
    dotenv.config({ path: path.join(__dirname, '.env.local') });
}
catch (error) {
    // dotenv no está instalado, pero las variables pueden estar ya cargadas
    // (por ejemplo, si se ejecuta desde Next.js o se configuraron manualmente)
}
// Obtener las credenciales de Supabase desde las variables de entorno
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
var supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
console.log('\n🔍 Verificando configuración de Supabase...\n');
// Verificar que las credenciales estén presentes
if (!supabaseUrl) {
    console.error('❌ ERROR: No se encontró NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL en .env.local');
    console.error('   Por favor, asegúrate de tener una de estas variables configurada.\n');
    process.exit(1);
}
if (!supabaseAnonKey) {
    console.error('❌ ERROR: No se encontró NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY en .env.local');
    console.error('   Por favor, asegúrate de tener una de estas variables configurada.\n');
    process.exit(1);
}
console.log('✅ Credenciales encontradas:');
console.log("   URL: ".concat(supabaseUrl.substring(0, 30), "..."));
console.log("   Key: ".concat(supabaseAnonKey.substring(0, 20), "...\n"));
// Inicializar el cliente de Supabase
console.log('🔌 Inicializando cliente de Supabase...\n');
var supabase;
try {
    supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
    console.log('✅ Cliente de Supabase inicializado correctamente\n');
}
catch (error) {
    console.error('❌ ERROR al inicializar el cliente de Supabase:');
    console.error(error);
    process.exit(1);
}
// Función principal de prueba
function testSupabaseConnection() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, sessionData, sessionError, error_1, _b, healthData, healthError, error_2, _c, tableData, tableError, error_3;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('🧪 Ejecutando pruebas de conexión...\n');
                    // Prueba 1: Obtener sesión actual (auth)
                    console.log('📋 Prueba 1: Verificando autenticación (auth.getSession)...');
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    _a = _d.sent(), sessionData = _a.data, sessionError = _a.error;
                    if (sessionError) {
                        console.log('⚠️  Advertencia al obtener sesión:', sessionError.message);
                        console.log('   (Esto es normal si no hay una sesión activa)\n');
                    }
                    else {
                        if (sessionData.session) {
                            console.log('✅ Sesión encontrada:', {
                                user: sessionData.session.user.email || sessionData.session.user.id,
                                expiresAt: sessionData.session.expires_at
                            });
                        }
                        else {
                            console.log('ℹ️  No hay sesión activa (esto es normal para una prueba inicial)\n');
                        }
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _d.sent();
                    console.error('❌ ERROR al verificar sesión:');
                    console.error('   Tipo:', error_1.constructor.name);
                    console.error('   Mensaje:', error_1.message);
                    console.error('   Detalles:', error_1);
                    return [2 /*return*/, false];
                case 4:
                    // Prueba 2: Verificar que el cliente puede hacer peticiones
                    console.log('📋 Prueba 2: Verificando conectividad con Supabase...');
                    _d.label = 5;
                case 5:
                    _d.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, supabase.auth.getUser()];
                case 6:
                    _b = _d.sent(), healthData = _b.data, healthError = _b.error;
                    if (healthError) {
                        // Si el error es de autenticación (no hay usuario), eso está bien
                        if (healthError.message.includes('JWT') || healthError.message.includes('session')) {
                            console.log('✅ Conectividad verificada (error de autenticación esperado sin sesión)\n');
                        }
                        else {
                            console.error('❌ ERROR de conectividad:', healthError.message);
                            return [2 /*return*/, false];
                        }
                    }
                    else {
                        console.log('✅ Conectividad verificada correctamente\n');
                    }
                    return [3 /*break*/, 8];
                case 7:
                    error_2 = _d.sent();
                    console.error('❌ ERROR de conectividad:');
                    console.error('   Tipo:', error_2.constructor.name);
                    console.error('   Mensaje:', error_2.message);
                    // Verificar si es un error de red
                    if (error_2.message.includes('fetch') || error_2.message.includes('network') || error_2.message.includes('ECONNREFUSED')) {
                        console.error('   ⚠️  Posible problema de red o URL incorrecta');
                    }
                    return [2 /*return*/, false];
                case 8:
                    // Prueba 3: Intentar una consulta a una tabla (opcional, solo si existe)
                    console.log('📋 Prueba 3: Verificando acceso a base de datos...');
                    _d.label = 9;
                case 9:
                    _d.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, supabase
                            .from('_test_connection')
                            .select('*')
                            .limit(1)];
                case 10:
                    _c = _d.sent(), tableData = _c.data, tableError = _c.error;
                    if (tableError) {
                        // Si el error es que la tabla no existe, eso está bien - significa que la conexión funciona
                        if (tableError.code === 'PGRST116' || tableError.message.includes('does not exist')) {
                            console.log('✅ Conexión a base de datos verificada (tabla de prueba no existe, pero la conexión funciona)\n');
                        }
                        else if (tableError.code === '42501' || tableError.message.includes('permission')) {
                            console.log('⚠️  Advertencia: Problema de permisos en la base de datos');
                            console.log('   Esto puede ser normal dependiendo de la configuración de RLS\n');
                        }
                        else {
                            console.log('ℹ️  Respuesta de base de datos:', tableError.message);
                            console.log('   (La conexión parece funcionar, pero hay un error específico)\n');
                        }
                    }
                    else {
                        console.log('✅ Acceso a base de datos verificado correctamente\n');
                    }
                    return [3 /*break*/, 12];
                case 11:
                    error_3 = _d.sent();
                    console.error('❌ ERROR al verificar acceso a base de datos:');
                    console.error('   Tipo:', error_3.constructor.name);
                    console.error('   Mensaje:', error_3.message);
                    return [2 /*return*/, false];
                case 12:
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('✅ ¡Todas las pruebas completadas!');
                    console.log('✅ La conexión con Supabase está funcionando correctamente');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                    return [2 /*return*/, true];
            }
        });
    });
}
// Ejecutar las pruebas
testSupabaseConnection()
    .then(function (success) {
    if (success) {
        process.exit(0);
    }
    else {
        console.error('\n❌ Algunas pruebas fallaron. Revisa los errores arriba.\n');
        process.exit(1);
    }
})
    .catch(function (error) {
    console.error('\n❌ ERROR FATAL durante las pruebas:');
    console.error(error);
    process.exit(1);
});
