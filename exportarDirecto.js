// exportarDirecto.js
require('dotenv').config();
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Función principal - sin interactividad, directamente obtiene todos los datos
async function exportarTodoDirecto() {
  try {
    console.log('🔄 INICIANDO EXPORTACIÓN DIRECTA DE TODOS LOS REGISTROS');
    console.log('🔌 Conectando a MongoDB...');
    
    // Conectar a MongoDB sin especificar un modelo concreto
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conexión exitosa a MongoDB');

    // Mostrar todas las colecciones disponibles
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Colecciones disponibles en la base de datos:');
    collections.forEach(col => console.log(` - ${col.name}`));

    // Intentar diferentes nombres de colección que podrían contener los datos
    const posiblesColecciones = ['cajachicas', 'CajaChica', 'cajachica', 'cajas', 'caja'];
    
    let coleccion;
    let nombreColeccion;
    
    // Probar diferentes nombres de colección
    for (const nombre of posiblesColecciones) {
      if (collections.some(col => col.name.toLowerCase() === nombre.toLowerCase())) {
        nombreColeccion = collections.find(col => 
          col.name.toLowerCase() === nombre.toLowerCase()
        ).name;
        coleccion = mongoose.connection.db.collection(nombreColeccion);
        break;
      }
    }
    
    // Si no encontramos la colección con los nombres probados, usar la primera colección
    if (!coleccion && collections.length > 0) {
      nombreColeccion = collections[0].name;
      coleccion = mongoose.connection.db.collection(nombreColeccion);
      console.log(`⚠️ No se encontró una colección específica, usando: ${nombreColeccion}`);
    }
    
    if (!coleccion) {
      throw new Error('No se pudo encontrar ninguna colección en la base de datos');
    }
    
    console.log(`🔍 Obteniendo TODOS los registros de la colección: ${nombreColeccion}`);
    
    // Obtener todos los documentos directamente de la colección
    const documentos = await coleccion.find({}).toArray();
    console.log(`📊 Se encontraron ${documentos.length} documentos en total`);

    if (documentos.length === 0) {
      console.log('⚠️ No se encontraron registros en la base de datos');
      await mongoose.connection.close();
      return;
    }

    // Imprimir información de muestra para verificar la estructura
    console.log('\n📋 MUESTRA DE ESTRUCTURA DE DATOS:');
    console.log(JSON.stringify(documentos[0], null, 2).substring(0, 500) + '...');
    
    // Crear libro Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Todos los Registros');
    const resumenSheet = workbook.addWorksheet('Resumen');
    
    // Determinar si los documentos tienen estructura de CajaChica
    const tieneCajaChicaEstructura = documentos[0].hasOwnProperty('chatId') && 
                                   documentos[0].hasOwnProperty('saldo');
    
    // Variables para estadísticas
    let resumenPorGrupo = {};
    let totalTransacciones = 0;
    let totalIngresos = 0;
    let totalGastos = 0;
    
    if (tieneCajaChicaEstructura) {
      // Configurar encabezados para estructura CajaChica
      worksheet.columns = [
        { header: 'ID Chat', key: 'chatId', width: 15 },
        { header: 'Grupo', key: 'grupo', width: 25 },
        { header: 'Tipo', key: 'tipo', width: 10 },
        { header: 'Monto', key: 'monto', width: 15, style: { numFmt: '$#,##0.00' } },
        { header: 'Concepto', key: 'concepto', width: 40 },
        { header: 'Fecha', key: 'fecha', width: 20 }
      ];
      
      // Procesar cada documento de CajaChica
      for (const doc of documentos) {
        const chatId = doc.chatId;
        const groupName = `Grupo ${chatId}`;
        
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
            
            // Agregar fila a Excel
            worksheet.addRow({
              chatId: chatId,
              grupo: groupName,
              tipo: t.tipo.toUpperCase(),
              monto: t.tipo === 'ingreso' ? t.monto : -t.monto,
              concepto: t.concepto,
              fecha: new Date(t.fecha).toLocaleString('es-MX')
            });
          });
        } else {
          console.log(`  ⚠️ No se encontraron transacciones`);
        }
      }
    } else {
      // Si no tiene estructura de CajaChica, exportar datos en bruto
      console.log('⚠️ Los documentos no tienen la estructura esperada. Exportando datos en bruto.');
      
      // Determinamos las columnas basadas en el primer documento
      const columnas = Object.keys(documentos[0]).map(key => ({
        header: key,
        key: key,
        width: 20
      }));
      
      worksheet.columns = columnas;
      
      // Agregar todos los documentos directamente
      documentos.forEach(doc => {
        worksheet.addRow(doc);
      });
    }
    
    // Estilo para encabezados
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Crear hoja de resumen si es estructura de CajaChica
    if (tieneCajaChicaEstructura) {
      resumenSheet.columns = [
        { header: 'ID Chat', key: 'chatId', width: 15 },
        { header: 'Grupo', key: 'nombre', width: 25 },
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
        saldo: documentos.reduce((sum, doc) => sum + (doc.saldo || 0), 0),
        transacciones: totalTransacciones
      });
      totalRow.font = { bold: true };
    }
    
    // Crear directorio de exportación si no existe
    const exportDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }
    
    // Guardar archivo
    const timestamp = new Date().toISOString().replace(/:/g, '-').substr(0, 19);
    const filePath = path.join(exportDir, `exportacion_completa_${timestamp}.xlsx`);
    
    console.log('💾 Guardando archivo Excel...');
    await workbook.xlsx.writeFile(filePath);
    
    console.log(`\n✅ EXPORTACIÓN EXITOSA: ${filePath}`);
    if (tieneCajaChicaEstructura) {
      console.log(`📊 Estadísticas:`);
      console.log(`  - Grupos encontrados: ${Object.keys(resumenPorGrupo).length}`);
      console.log(`  - Total transacciones: ${totalTransacciones}`);
      console.log(`  - Total ingresos: $${totalIngresos.toFixed(2)}`);
      console.log(`  - Total gastos: $${totalGastos.toFixed(2)}`);
      console.log(`  - Saldo acumulado: $${documentos.reduce((sum, doc) => sum + (doc.saldo || 0), 0).toFixed(2)}`);
    }
    
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA EXPORTACIÓN:', error);
    if (error.message.includes('ENOENT')) {
      console.error('🔴 No se pudo acceder a la base de datos. Verifica la variable MONGODB_URI en tu archivo .env');
    }
    
    if (mongoose.connection) {
      try {
        await mongoose.connection.close();
        console.log('🔌 Conexión a MongoDB cerrada');
      } catch (e) {}
    }
  }
}

// Ejecutar
exportarTodoDirecto();