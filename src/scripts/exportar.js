// src/scripts/exportar.js
/**
 * Script único y completo para exportar datos de caja chica con nombres de grupos
 * REEMPLAZA todos los scripts anteriores de exportación
 */
require('dotenv').config();
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

async function exportarConNombres() {
  try {
    console.log('🔄 INICIANDO EXPORTACIÓN CON NOMBRES REALES DE GRUPOS');
    
    // Verificar variables de entorno
    const token = process.env.TELEGRAM_TOKEN;
    if (!token) {
      console.error('❌ Error: TELEGRAM_TOKEN no está definido en el archivo .env');
      process.exit(1);
    }

    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ Error: MONGODB_URI no está definido en el archivo .env');
      process.exit(1);
    }
    
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Conexión exitosa a MongoDB');
    
    // Definir esquema y modelo para información de grupos (solo si no existe)
    let GrupoInfo;
    try {
      GrupoInfo = mongoose.model('GrupoInfo');
    } catch (e) {
      const grupoInfoSchema = new mongoose.Schema({
        chatId: { type: Number, required: true, unique: true },
        title: { type: String, required: true },
        type: { type: String },
        ultimaActualizacion: { type: Date, default: Date.now }
      });
      GrupoInfo = mongoose.model('GrupoInfo', grupoInfoSchema);
    }
    
    // Obtener lista de chatIds desde la colección de cajas
    console.log('📊 Obteniendo lista de chatIds...');
    const cajasCollection = mongoose.connection.db.collection('cajachicas');
    const cajas = await cajasCollection.find({}).toArray();
    
    if (cajas.length === 0) {
      console.log('⚠️ No se encontraron documentos en la colección cajachicas');
      await mongoose.connection.close();
      return;
    }
    
    // Extraer chatIds únicos
    const chatIds = [...new Set(cajas.map(caja => caja.chatId))];
    console.log(`📱 Se encontraron ${chatIds.length} chatIds únicos`);
    
    // Obtener nombres de grupos ya guardados en la base de datos
    let nombresGrupos = {};
    const gruposGuardados = await GrupoInfo.find({});
    
    gruposGuardados.forEach(grupo => {
      nombresGrupos[grupo.chatId] = grupo.title;
    });
    
    console.log(`📊 Se encontraron ${Object.keys(nombresGrupos).length} nombres de grupos en la base de datos`);
    
    // Para los chatIds que no tienen nombre, intentar obtenerlos de Telegram
    const chatIdsSinNombre = chatIds.filter(id => !nombresGrupos[id]);
    
    if (chatIdsSinNombre.length > 0) {
      console.log(`🔍 Obteniendo información de ${chatIdsSinNombre.length} grupos sin nombre desde Telegram...`);
      
      // Iniciar bot de Telegram
      const bot = new TelegramBot(token, { polling: false });
      
      // Procesar cada chatId sin nombre
      for (const chatId of chatIdsSinNombre) {
        try {
          console.log(`  Consultando información del chat: ${chatId}`);
          
          // Intentar obtener información del chat
          const chatInfo = await bot.getChat(chatId);
          
          if (chatInfo && chatInfo.title) {
            console.log(`  ✅ Grupo encontrado: "${chatInfo.title}" (${chatId})`);
            
            // Guardar en la lista de nombres
            nombresGrupos[chatId] = chatInfo.title;
            
            // Guardar en MongoDB
            await GrupoInfo.findOneAndUpdate(
              { chatId },
              {
                chatId,
                title: chatInfo.title,
                type: chatInfo.type,
                ultimaActualizacion: new Date()
              },
              { upsert: true, new: true }
            );
          } else {
            console.log(`  ⚠️ No se pudo obtener el título del grupo ${chatId}`);
          }
          
          // Pequeña pausa para no saturar la API
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.log(`  ❌ Error al obtener información del chat ${chatId}: ${error.message}`);
        }
      }
    }
    
    // Mostrar ejemplos de nombres de grupos
    if (Object.keys(nombresGrupos).length > 0) {
      console.log('\n📝 Ejemplos de nombres de grupos:');
      Object.entries(nombresGrupos).slice(0, 5).forEach(([id, nombre]) => {
        console.log(`  - ${id}: "${nombre}"`);
      });
    }
    
    // EXPORTACIÓN A EXCEL
    console.log('\n📊 INICIANDO EXPORTACIÓN A EXCEL');
    
    // Crear libro Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Todos los Registros');
    const resumenSheet = workbook.addWorksheet('Resumen');
    
    // Configurar encabezados para estructura CajaChica
    worksheet.columns = [
      { header: 'ID Chat', key: 'chatId', width: 15 },
      { header: 'Grupo', key: 'grupo', width: 30 },
      { header: 'Tipo', key: 'tipo', width: 10 },
      { header: 'Monto', key: 'monto', width: 15, style: { numFmt: '$#,##0.00' } },
      { header: 'Concepto', key: 'concepto', width: 40 },
      { header: 'Fecha', key: 'fecha', width: 20, style: { numFmt: 'dd/mm/yyyy hh:mm:ss' } }
    ];
    
    // Variables para estadísticas
    let resumenPorGrupo = {};
    let totalTransacciones = 0;
    let totalIngresos = 0;
    let totalGastos = 0;
    
    // Procesar cada documento de CajaChica
    for (const doc of cajas) {
      const chatId = doc.chatId;
      
      // Obtener nombre de grupo desde el mapeo o usar valor predeterminado
      const groupName = nombresGrupos[chatId] || `Grupo ${chatId}`;
      
      console.log(`📝 Procesando ${groupName} (Saldo: $${doc.saldo || 0})`);
      
      // Inicializar resumen para este grupo
      if (!resumenPorGrupo[chatId]) {
        resumenPorGrupo[chatId] = {
          chatId,
          nombre: groupName,
          ingresos: 0,
          gastos: 0,
          saldo: doc.saldo || 0,
          transacciones: 0
        };
      }
      
      // Verificar transacciones
      if (doc.transacciones && doc.transacciones.length > 0) {
        console.log(`  📊 Encontradas ${doc.transacciones.length} transacciones`);
        totalTransacciones += doc.transacciones.length;
        resumenPorGrupo[chatId].transacciones = doc.transacciones.length;
        
        // Agregar cada transacción
        doc.transacciones.forEach(t => {
          // Actualizar contadores
          if (t.tipo === 'ingreso') {
            totalIngresos += t.monto;
            resumenPorGrupo[chatId].ingresos += t.monto;
          } else {
            totalGastos += t.monto;
            resumenPorGrupo[chatId].gastos += t.monto;
          }
          
          // Agregar fila a Excel con fecha como objeto Date para correcto formato
          worksheet.addRow({
            chatId: chatId,
            grupo: groupName,  // Usar nombre real del grupo
            tipo: t.tipo.toUpperCase(),
            monto: t.tipo === 'ingreso' ? t.monto : -t.monto,
            concepto: t.concepto,
            fecha: new Date(t.fecha)  // Usar Date object para correcto formato
          });
        });
      } else {
        console.log(`  ⚠️ No se encontraron transacciones`);
      }
    }
    
    // Estilo para encabezados
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Crear hoja de resumen
    resumenSheet.columns = [
      { header: 'ID Chat', key: 'chatId', width: 15 },
      { header: 'Grupo', key: 'nombre', width: 30 },
      { header: 'Total Ingresos', key: 'ingresos', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Total Gastos', key: 'gastos', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Saldo', key: 'saldo', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Transacciones', key: 'transacciones', width: 15 }
    ];
    
    // Encabezados con estilo
    resumenSheet.getRow(1).font = { bold: true };
    resumenSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Agregar resumen por grupo
    Object.values(resumenPorGrupo).forEach(grupo => {
      resumenSheet.addRow(grupo);
    });
    
    // Agregar fila de totales
    resumenSheet.addRow({});
    const totalRow = resumenSheet.addRow({
      chatId: '',
      nombre: 'TOTAL',
      ingresos: totalIngresos,
      gastos: totalGastos,
      saldo: cajas.reduce((sum, doc) => sum + (doc.saldo || 0), 0),
      transacciones: totalTransacciones
    });
    totalRow.font = { bold: true };
    
    // Crear directorio de exportación si no existe
    const exportDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }
    
    // Guardar archivo
    const timestamp = new Date().toISOString().replace(/:/g, '-').substr(0, 19);
    const filePath = path.join(exportDir, `exportacion_${timestamp}.xlsx`);
    
    console.log('💾 Guardando archivo Excel...');
    await workbook.xlsx.writeFile(filePath);
    
    console.log(`\n✅ EXPORTACIÓN EXITOSA: ${filePath}`);
    console.log(`📊 Estadísticas:`);
    console.log(`  - Grupos encontrados: ${Object.keys(resumenPorGrupo).length}`);
    console.log(`  - Total transacciones: ${totalTransacciones}`);
    console.log(`  - Total ingresos: $${totalIngresos.toFixed(2)}`);
    console.log(`  - Total gastos: $${totalGastos.toFixed(2)}`);
    console.log(`  - Saldo acumulado: $${cajas.reduce((sum, doc) => sum + (doc.saldo || 0), 0).toFixed(2)}`);
    
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    console.error(error);
    
    if (mongoose.connection) {
      try {
        await mongoose.connection.close();
        console.log('🔌 Conexión a MongoDB cerrada');
      } catch (e) {}
    }
  }
}

// Ejecutar función principal
exportarConNombres();