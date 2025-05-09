//Required Packages
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const helmet = require('helmet');
const setupSwagger = require("./swagger");
// const axios = require('axios')
// const ExcelJS = require('exceljs');
// const fs = require('fs');

//Routes Paths
const routes = require("./routes/index");

// Controller Path
const globalErrorHandler = require("./controllers/errorController");
const AppError = require("./utils/appError");


//Express APP
const app = express();

// Pug View 
app.enable('trust proxy');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Enable CORS for all routes
const corsOption = {
  origin: true,
  credentials: true,
};
app.use(cors(corsOption));

// Cookie Parser
app.use(cookieParser());

//Third party Middlewares
app.use(helmet());

//compression
app.use(compression());

// // Limit requests from same API
// const limiter = rateLimit({
//   max: 10000,
//   windowMs: 60 * 60 * 1000,
//   message: 'Too many requests from this IP, please try again in an hour!'
// });

// app.use('/api', limiter
// 
// );
const API_KEY = process.env.TICKETMASTER_API_KEY


// app.get('/classifications-full', async (req, res) => {
//   try {
//     const response = await axios.get(
//       'https://app.ticketmaster.com/discovery/v2/classifications.json',
//       {
//         params: { apikey: API_KEY }
//       }
//     );

//     const classifications = response.data._embedded.classifications;
//     const formatted = [];

//     classifications.forEach((item) => {
//       const segment = item.segment;

//       if (!segment?.id || !segment.name) return;

//       // Avoid duplicate segments
//       let segmentEntry = formatted.find((s) => s.id === segment.id);
//       if (!segmentEntry) {
//         segmentEntry = {
//           id: segment.id,
//           name: segment.name,
//           genres: []
//         };
//         formatted.push(segmentEntry);
//       }

//       const genres = segment._embedded?.genres || [];

//       genres.forEach((genre) => {
//         if (!genre.id || !genre.name) return;

//         let genreEntry = segmentEntry.genres.find((g) => g.id === genre.id);
//         if (!genreEntry) {
//           genreEntry = {
//             id: genre.id,
//             name: genre.name,
//             subgenres: []
//           };
//           segmentEntry.genres.push(genreEntry);
//         }

//         const subgenres = genre._embedded?.subgenres || [];
//         subgenres.forEach((sub) => {
//           if (
//             sub.id &&
//             sub.name &&
//             !genreEntry.subgenres.find((s) => s.id === sub.id)
//           ) {
//             genreEntry.subgenres.push({
//               id: sub.id,
//               name: sub.name
//             });
//           }
//         });
//       });
//     });

//     res.json(formatted);
//   } catch (error) {
//     console.error(error.response?.data || error.message);
//     res.status(500).json({ error: 'Failed to fetch classifications' });
//   }
// });


// Route to export classifications data to Excel
// app.get('/export-to-excel', async (req, res) => {
//   try {
//     const response = await axios.get(
//       'https://app.ticketmaster.com/discovery/v2/classifications.json',
//       { params: { apikey: API_KEY } }
//     );

//     const classifications = response.data._embedded.classifications;

//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Classifications');

//     // Header row
//     worksheet.columns = [
//       { header: 'Segment ID', key: 'segment_id', width: 25 },
//       { header: 'Segment Name', key: 'segment_name', width: 25 },
//       { header: 'Genre ID', key: 'genre_id', width: 25 },
//       { header: 'Genre Name', key: 'genre_name', width: 25 },
//       { header: 'Subgenre ID', key: 'subgenre_id', width: 30 },
//       { header: 'Subgenre Name', key: 'subgenre_name', width: 30 }
//     ];

//     // Populate rows
//     classifications.forEach((item) => {
//       const segment = item.segment;

//       if (!segment?.id || !segment.name) return;

//       const genres = segment._embedded?.genres || [];

//       genres.forEach((genre) => {
//         const subgenres = genre._embedded?.subgenres || [];

//         if (subgenres.length === 0) {
//           // If no subgenres, add a row with just genre info
//           worksheet.addRow({
//             segment_id: segment.id,
//             segment_name: segment.name,
//             genre_id: genre.id,
//             genre_name: genre.name
//           });
//         } else {
//           subgenres.forEach((sub) => {
//             worksheet.addRow({
//               segment_id: segment.id,
//               segment_name: segment.name,
//               genre_id: genre.id,
//               genre_name: genre.name,
//               subgenre_id: sub.id,
//               subgenre_name: sub.name
//             });
//           });
//         }
//       });
//     });

//     // Set response headers
//     res.setHeader(
//       'Content-Type',
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//     );
//     res.setHeader('Content-Disposition', 'attachment; filename=classifications.xlsx');

//     // Write the Excel file to the response
//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (error) {
//     console.error(error.response?.data || error.message);
//     res.status(500).json({ error: 'Failed to export to Excel' });
//   }
// });




// app.get('/export-to-json', async (req, res) => {
//   try {
//     const response = await axios.get(
//       'https://app.ticketmaster.com/discovery/v2/classifications.json',
//       { params: { apikey: API_KEY } }
//     );

//     const classifications = response.data._embedded.classifications;
//     const jsonData = [];

//     classifications.forEach((item) => {
//       const segment = item.segment;

//       if (!segment?.id || !segment.name) return;

//       const genres = segment._embedded?.genres || [];

//       genres.forEach((genre) => {
//         const subgenres = genre._embedded?.subgenres || [];

//         if (subgenres.length === 0) {
//           jsonData.push({
//             segment_id: segment.id,
//             segment_name: segment.name,
//             genre_id: genre.id,
//             genre_name: genre.name
//           });
//         } else {
//           subgenres.forEach((sub) => {
//             jsonData.push({
//               segment_id: segment.id,
//               segment_name: segment.name,
//               genre_id: genre.id,
//               genre_name: genre.name,
//               subgenre_id: sub.id,
//               subgenre_name: sub.name
//             });
//           });
//         }
//       });
//     });

//     const filePath = path.join(__dirname, 'classifications.json');
//     fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));

//     res.json({ message: 'Data successfully saved to classifications.json' });
//   } catch (error) {
//     console.error(error.response?.data || error.message);
//     res.status(500).json({ error: 'Failed to export to JSON' });
//   }
// });


// Parse incoming JSON payloads
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);


// Parse incoming URL-encoded payloads
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

setupSwagger(app);

// Data sanitization against XSS
app.use(xss());

//view the request url
if (process.env.NODE_ENV === "development") {
  app.use(
    morgan(
      ":method :url :status :res[content-length] bytes - :response-time ms"
    )
  );
}

//Routes Middleware
app.use("/api/v1", routes);

//Unknown API endpoint
app.use((req, res, next) => {
  next(new AppError(`Requested URL (${req.originalUrl}) does not exist`, 404));
});

//Global Error Handler
app.use(globalErrorHandler);

//Export File
module.exports = app;
