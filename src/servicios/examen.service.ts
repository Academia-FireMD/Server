import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Dificultad, EstadoExamen, Examen, Rol, TestStatus, TipoAcceso } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, UnderlineType, WidthType } from 'docx';
import * as fs from 'fs';
import * as MarkdownIt from 'markdown-it';
import * as path from 'path';
import { NewExamenDto } from 'src/dtos/nex-examen.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { generarIdentificador } from 'src/utils/utils';
import { PaginatedResult, PaginatedService } from './paginated.service';
import { PrismaService } from './prisma.service';
import { TestService } from './test.service';
@Injectable()
export class ExamenService extends PaginatedService<Examen> {
    constructor(
        protected prisma: PrismaService,
        private testService: TestService,
    ) {
        super(prisma);
    }

    protected getModelName(): string {
        return 'examen';
    }

    async generateWordDocument(examenId: number, conSoluciones: boolean = false) {
        const examen = await this.prisma.examen.findUnique({
            where: { id: examenId },
            include: {
                test: {
                    include: {
                        testPreguntas: {
                            include: {
                                pregunta: {
                                    include: {
                                        tema: true
                                    }
                                }
                            },
                            orderBy: {
                                orden: 'asc'
                            }
                        }
                    }
                },
            }
        });

        if (!examen) throw new NotFoundException('Examen no encontrado');

        // Generar nombre de archivo
        const fechaActual = new Date();
        const fechaFormateada = fechaActual.toISOString().split('T')[0]; // formato YYYY-MM-DD

        // Escapar y formatear el título
        const tituloFormateado = examen.titulo
            .toLowerCase()
            .replace(/[^\w\s]/gi, '') // Eliminar caracteres especiales
            .replace(/\s+/g, '_');    // Reemplazar espacios con guiones bajos

        const filename = `${tituloFormateado}_${fechaFormateada}.docx`;

        // Inicializar markdown-it con todas las opciones habilitadas
        const md = new MarkdownIt({
            html: true,
            breaks: true,
            linkify: true,
            typographer: true
        });

        const descripcionHtml = md.render(examen.descripcion || '');

        // Convertir HTML a elementos de documento Word
        const descripcionParagraphs = await this.htmlToDocxElements(descripcionHtml);

        // Crear el documento con elementos iniciales
        const docElements = [
            // Título del examen (sin prefijo, solo el título como H1)
            new Paragraph({
                text: examen.titulo,
                heading: HeadingLevel.HEADING_1,
                spacing: {
                    after: 200
                }
            }),
        ];

        // Añadir descripción si existe
        if (examen.descripcion) {
            docElements.push(...(descripcionParagraphs as Paragraph[]));
            docElements.push(
                new Paragraph({
                    text: '',
                    spacing: {
                        after: 200
                    }
                })
            );
        }

        // Procesar todas las preguntas
        const preguntasElements = await Promise.all(
            examen.test.testPreguntas.map(async (testPregunta, index) => {
                const pregunta = testPregunta.pregunta;
                const elements = [];

                // Limpiar y normalizar el texto de la pregunta y respuestas
                const descripcionLimpia = pregunta.descripcion.replace(/\s+/g, ' ').trim();

                // Procesar cada respuesta para eliminar saltos de línea y espacios extra
                const respuestasLimpias = pregunta.respuestas.map(r => {
                    return r.replace(/\s+/g, ' ').trim();
                });

                // Añadir la pregunta
                elements.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `${index + 1}. ${descripcionLimpia}`,
                                bold: true
                            })
                        ],
                        spacing: {
                            after: 100
                        }
                    })
                );

                // Añadir las respuestas
                respuestasLimpias.forEach((respuesta, rIndex) => {
                    const esRespuestaCorrecta = rIndex === pregunta.respuestaCorrectaIndex;
                    
                    if (conSoluciones && esRespuestaCorrecta) {
                        // Para respuestas correctas en modo soluciones, crear un párrafo con fondo verde
                        elements.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `${String.fromCharCode(97 + rIndex)}) ${respuesta}`,
                                        bold: true,
                                    })
                                ],
                                indent: {
                                    left: 720 // 0.5 pulgadas en twips
                                },
                                shading: {
                                    type: "clear",
                                    color: "auto",
                                    fill: "92D050"
                                }
                            })
                        );
                    } else {
                        // Para respuestas normales
                        elements.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `${String.fromCharCode(97 + rIndex)}) ${respuesta}`,
                                    })
                                ],
                                indent: {
                                    left: 720 // 0.5 pulgadas en twips
                                }
                            })
                        );
                    }
                });

                // Espacio después de las respuestas
                elements.push(
                    new Paragraph({
                        text: '',
                        spacing: {
                            after: 100
                        }
                    })
                );

                // Si se solicitan soluciones, añadir la solución después de las respuestas
                if (conSoluciones && pregunta.solucion) {
                    const solucionHtml = md.render(pregunta.solucion);
                    
                    // Espacio antes de la solución
                    elements.push(
                        new Paragraph({
                            text: '',
                            spacing: {
                                after: 100
                            }
                        })
                    );
                    
                    // Convertir la solución HTML a elementos de documento Word
                    const $ = cheerio.load(solucionHtml);
                    const bodyElements = $('body').children().toArray();
                    for (const element of bodyElements) {
                        const docxElements = await this.processHtmlElement($, element, 720); // Indentación adicional
                        elements.push(...docxElements);
                    }
                }

                // Espacio después de la pregunta completa
                elements.push(
                    new Paragraph({
                        text: '',
                        spacing: {
                            after: 200
                        }
                    })
                );

                return elements;
            })
        );

        // Aplanar el array de arrays manualmente
        for (const preguntaElements of preguntasElements) {
            docElements.push(...preguntaElements);
        }

        // Crear el documento final
        const doc = new Document({
            sections: [{
                properties: {},
                children: docElements
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        return { buffer, filename };
    }

    public async addPreguntasToAcademia(examenId: number) {
        return this.prisma.$transaction(async (tx) => {
            const examen = await tx.examen.findUnique({
                where: { id: examenId },
                include: { test: { include: { testPreguntas: { include: { pregunta: true } } } } }
            });

            const preguntas = examen?.test.testPreguntas.map(tp => tp.pregunta);

            if (!preguntas) throw new NotFoundException('No se encontraron preguntas en el examen');

            const preguntasExamen = preguntas.filter(p => {
                const identificadorFirstPart = p.identificador.split(".")[0];
                const lastCharacter = identificadorFirstPart[identificadorFirstPart.length - 1];
                return lastCharacter === "E";
            });

            if (!preguntasExamen.length) throw new NotFoundException('No se encontraron preguntas con identificador "E" en el examen');

            // Crear un nuevo array con las preguntas modificadas, sin el id
            const preguntasParaCrear = await Promise.all(preguntasExamen.map(async (pregunta) => {
                const { id, dificultad, ...preguntaSinId } = pregunta; // Desestructuramos para excluir el id
                return {
                    ...preguntaSinId,
                    dificultad: Dificultad.INTERMEDIO,
                    identificador: await generarIdentificador(Rol.ADMIN, "PREGUNTA", pregunta.temaId, tx as any)
                };
            }));
            let numeroAnyadidas = 0;
            let numeroNoAnyadidas = 0;
            for (let i = 0; i < preguntasParaCrear.length; i++) {
                const preguntaParaCrear = preguntasParaCrear[i];
                try {
                    await tx.pregunta.create({
                        data: preguntaParaCrear
                    });
                    numeroAnyadidas++;
                } catch (error) {
                    numeroNoAnyadidas++;
                }

            }

            return {
                message: `Se han añadido ${numeroAnyadidas} preguntas a la academia, ${numeroNoAnyadidas} preguntas ya existían`,
                preguntas: preguntasExamen
            }
        });
    }

    // Método mejorado para convertir HTML a elementos de documento Word
    private async htmlToDocxElements(html: string): Promise<Array<Paragraph | Table>> {
        const elements: Array<Paragraph | Table> = [];

        // Usar cheerio para parsear el HTML
        const $ = cheerio.load(html);

        // Procesar el cuerpo del HTML
        for (const element of $('body').children().toArray()) {
            const docxElements = await this.processHtmlElement($, element);
            elements.push(...docxElements);
        }

        return elements;
    }

    private async processHtmlElement($: cheerio.CheerioAPI, element: any, indentation: number = 0): Promise<Array<Paragraph | Table>> {
        const elements: Array<Paragraph | Table> = [];
        const tagName = element.tagName.toLowerCase();

        switch (tagName) {
            case 'p':
                elements.push(await this.createParagraphFromElement($, element, indentation));
                break;

            case 'ul':
            case 'ol':
                $(element).children('li').each((index, li) => {
                    const prefix = tagName === 'ul' ? '• ' : `${index + 1}. `;
                    elements.push(this.createListItemParagraph($, li, prefix, indentation));
                });
                break;

            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                const level = parseInt(tagName.substring(1));
                const headingLevel = this.getHeadingLevel(level);
                elements.push(
                    new Paragraph({
                        text: $(element).text(),
                        heading: headingLevel,
                        spacing: { after: 200 },
                        indent: {
                            left: indentation
                        }
                    })
                );
                break;

            case 'blockquote':
                elements.push(
                    new Paragraph({
                        children: [new TextRun($(element).text())],
                        indent: { left: indentation + 720 },
                        spacing: { after: 200 },
                        border: {
                            left: { style: BorderStyle.SINGLE, size: 3 }
                        }
                    })
                );
                break;

            case 'hr':
                elements.push(
                    new Paragraph({
                        text: '',
                        border: {
                            bottom: { style: BorderStyle.SINGLE, size: 1 }
                        },
                        spacing: { after: 200 },
                        indent: {
                            left: indentation
                        }
                    })
                );
                break;

            case 'table':
                elements.push(await this.createTableFromElement($, element));
                break;

            default:
                // Para otros elementos, intentamos extraer el texto
                if ($(element).text().trim()) {
                    elements.push(
                        new Paragraph({
                            text: $(element).text(),
                            spacing: { after: 100 },
                            indent: {
                                left: indentation
                            }
                        })
                    );
                }
                break;
        }

        return elements;
    }

    private async createParagraphFromElement($: cheerio.CheerioAPI, element: any, indentation: number = 0): Promise<Paragraph> {
        const children: Array<TextRun | ImageRun> = [];

        // Procesar nodos hijos
        await this.processTextAndImageNodes($, element, children);

        return new Paragraph({
            children,
            spacing: { after: 200 },
            indent: {
                left: indentation
            }
        });
    }

    private createListItemParagraph($: cheerio.CheerioAPI, element: any, prefix: string, indentation: number = 0): Paragraph {
        const children: TextRun[] = [new TextRun({ text: prefix })];

        // Procesar nodos hijos (solo texto para listas por simplicidad)
        this.processTextNodes($, element, children);

        return new Paragraph({
            children,
            indent: { left: 360 },
            spacing: { after: 100 },
        });
    }

    private async createTableFromElement($: cheerio.CheerioAPI, element: any): Promise<Table> {
        const rows: TableRow[] = [];

        // Procesar filas de encabezado (thead)
        const thead = $(element).find('thead');
        if (thead.length > 0) {
            $(thead).find('tr').each((_, tr) => {
                const cells: TableCell[] = [];
                $(tr).find('th').each((_, th) => {
                    cells.push(
                        new TableCell({
                            children: [
                                new Paragraph({
                                    text: $(th).text(),
                                    alignment: AlignmentType.CENTER,
                                    spacing: { after: 100 }
                                })
                            ],
                            shading: {
                                fill: 'F2F2F2'
                            }
                        })
                    );
                });

                if (cells.length > 0) {
                    rows.push(new TableRow({ children: cells }));
                }
            });
        }

        // Procesar filas de cuerpo (tbody)
        const tbody = $(element).find('tbody').length > 0 ? $(element).find('tbody') : $(element);
        $(tbody).find('tr').each((_, tr) => {
            const cells: TableCell[] = [];
            $(tr).find('td').each((_, td) => {
                cells.push(
                    new TableCell({
                        children: [
                            new Paragraph({
                                text: $(td).text(),
                                spacing: { after: 100 }
                            })
                        ]
                    })
                );
            });

            if (cells.length > 0) {
                rows.push(new TableRow({ children: cells }));
            }
        });

        return new Table({
            rows,
            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            }
        });
    }

    private async processTextAndImageNodes($: cheerio.CheerioAPI, element: any, children: Array<TextRun | ImageRun>): Promise<void> {
        for (const node of $(element).contents().toArray()) {
            if (node.type === 'text') {
                // Nodo de texto simple
                children.push(new TextRun({ text: $(node).text() }));
            } else if (node.type === 'tag') {
                // Elemento con formato
                const tagName = node.tagName.toLowerCase();

                switch (tagName) {
                    case 'strong':
                    case 'b':
                        children.push(new TextRun({ text: $(node).text(), bold: true }));
                        break;

                    case 'em':
                    case 'i':
                        children.push(new TextRun({ text: $(node).text(), italics: true }));
                        break;

                    case 'u':
                        children.push(new TextRun({
                            text: $(node).text(),
                            underline: { type: UnderlineType.SINGLE }
                        }));
                        break;

                    case 'code':
                        children.push(new TextRun({
                            text: $(node).text(),
                            font: 'Courier New'
                        }));
                        break;

                    case 'a':
                        children.push(new TextRun({
                            text: $(node).text(),
                            underline: { type: UnderlineType.SINGLE },
                            color: '0000FF'
                        }));
                        break;

                    case 'input':
                        // Manejar checkboxes
                        if ($(node).attr('type') === 'checkbox') {
                            const isChecked = $(node).attr('checked') !== undefined;
                            children.push(new TextRun({
                                text: isChecked ? '☑ ' : '☐ '
                            }));
                        }
                        break;

                    case 'img':
                        try {
                            const imageRun = await this.processImageElement($, node);
                            if (imageRun) {
                                children.push(imageRun);
                            }
                        } catch (error) {
                            console.error('Error procesando imagen:', error);
                            // Añadir texto alternativo si la imagen no se puede procesar
                            const alt = $(node).attr('alt') || '[Imagen]';
                            children.push(new TextRun({ text: alt }));
                        }
                        break;

                    default:
                        // Para otros elementos, procesamos recursivamente
                        await this.processTextAndImageNodes($, node, children);
                        break;
                }
            }
        }
    }

    private processTextNodes($: cheerio.CheerioAPI, element: any, children: TextRun[]): void {
        $(element).contents().each((_, node) => {
            if (node.type === 'text') {
                // Nodo de texto simple
                children.push(new TextRun({ text: $(node).text() }));
            } else if (node.type === 'tag') {
                // Elemento con formato
                const tagName = node.tagName.toLowerCase();

                switch (tagName) {
                    case 'strong':
                    case 'b':
                        children.push(new TextRun({ text: $(node).text(), bold: true }));
                        break;

                    case 'em':
                    case 'i':
                        children.push(new TextRun({ text: $(node).text(), italics: true }));
                        break;

                    case 'u':
                        children.push(new TextRun({
                            text: $(node).text(),
                            underline: { type: UnderlineType.SINGLE }
                        }));
                        break;

                    case 'code':
                        children.push(new TextRun({
                            text: $(node).text(),
                            font: 'Courier New'
                        }));
                        break;

                    case 'a':
                        children.push(new TextRun({
                            text: $(node).text(),
                            underline: { type: UnderlineType.SINGLE },
                            color: '0000FF'
                        }));
                        break;

                    case 'input':
                        // Manejar checkboxes
                        if ($(node).attr('type') === 'checkbox') {
                            const isChecked = $(node).attr('checked') !== undefined;
                            children.push(new TextRun({
                                text: isChecked ? '☑ ' : '☐ '
                            }));
                        }
                        break;

                    default:
                        // Para otros elementos, procesamos recursivamente
                        this.processTextNodes($, node, children);
                        break;
                }
            }
        });
    }

    private async processImageElement($: cheerio.CheerioAPI, element: any): Promise<ImageRun | null> {
        const src = $(element).attr('src');
        if (!src) return null;

        try {
            let imageData: Buffer;

            // Manejar imágenes base64
            if (src.startsWith('data:image')) {
                const base64Data = src.split(',')[1];
                imageData = Buffer.from(base64Data, 'base64');
            }
            // Manejar imágenes locales
            else if (src.startsWith('/') || src.startsWith('./') || src.startsWith('../')) {
                const imagePath = path.resolve(process.cwd(), src.startsWith('/') ? src.substring(1) : src);
                imageData = fs.readFileSync(imagePath);
            }
            // Manejar imágenes remotas
            else {
                const response = await axios.get(src, { responseType: 'arraybuffer' });
                imageData = Buffer.from(response.data);
            }

            // Determinar dimensiones de la imagen (puedes ajustar según necesites)
            const width = parseInt($(element).attr('width') || '300');
            const height = parseInt($(element).attr('height') || '200');

            return new ImageRun({
                data: imageData,
                transformation: {
                    width,
                    height
                },
                type: 'png',
            });
        } catch (error) {
            console.error('Error procesando imagen:', error);
            return null;
        }
    }

    private getHeadingLevel(level: number) {
        switch (level) {
            case 1: return HeadingLevel.HEADING_1;
            case 2: return HeadingLevel.HEADING_2;
            case 3: return HeadingLevel.HEADING_3;
            case 4: return HeadingLevel.HEADING_4;
            case 5: return HeadingLevel.HEADING_5;
            default: return HeadingLevel.HEADING_6;
        }
    }

    public async getPaginatedData(
        dto: PaginationDto,
        where: object = {},
        include: object = {},
    ): Promise<PaginatedResult<Examen>> {
        const count = await this.prisma.examen.count({
            where,
        });

        const data = await this.prisma.examen.findMany({
            where,
            take: dto.take,
            skip: dto.skip,
            include,
            orderBy: {
                createdAt: 'desc',
            },
        });

        return {
            data,
            pagination: {
                ...dto,
                count,
            },
        };
    }

    // Crear un nuevo examen (solo para administradores)
    public async createExamen(dto: NewExamenDto, creadorId: number) {
        if (!dto.relevancia || dto.relevancia.length == 0) {
            throw new BadRequestException("Debes seleccionar al menos una relevancia");
        }
        if (!dto.titulo) {
            throw new BadRequestException("Debes introducir un título");
        }
        if (!dto.descripcion) {
            throw new BadRequestException("Debes introducir una descripción");
        }

        // Primero creamos un test vacío que se asociará al examen
        const test = await this.prisma.test.create({
            data: {
                realizadorId: creadorId,
                status: TestStatus.CREADO,
                duration: dto.duracion,
            },
        });

        if (dto.preguntasSeleccionadas && dto.preguntasSeleccionadas.length > 0) {
            await this.prisma.testPregunta.createMany({
                data: dto.preguntasSeleccionadas.map((pregunta) => ({
                    testId: test.id,
                    preguntaId: pregunta.id,
                })),
            });
        }
        return this.prisma.examen.create({
            data: {
                test: {
                    connect: { id: test.id }
                },
                titulo: dto.titulo,
                descripcion: dto.descripcion,
                estado: EstadoExamen.BORRADOR,
                tipoAcceso: dto.tipoAcceso,
                codigoAcceso: dto.codigoAcceso,
                fechaActivacion: dto.fechaActivacion ? new Date(dto.fechaActivacion) : null,
                fechaSolucion: dto.fechaSolucion ? new Date(dto.fechaSolucion) : null,
                relevancia: dto.relevancia || [],
                createdBy: {
                    connect: { id: creadorId },
                },
            },
        });
    }

    public async getExamenById(id: number) {
        return this.prisma.examen.findUnique({
            where: { id },
            include: {
                test: {
                    include: {
                        testPreguntas: {
                            include: {
                                pregunta: true
                            },
                            orderBy: {
                                orden: 'asc'
                            }
                        }
                    }
                },
            },
        });
    }

    private obtenerSuscripcion(userId: number) {
        return this.prisma.suscripcion.findFirst({
            where: {
                usuarioId: userId,
                OR: [
                    {
                        fechaFin: {
                            gt: new Date()
                        }
                    },
                    {
                        fechaFin: {
                            equals: null
                        }
                    }
                ]
            }
        });
    }

    // Obtener todos los exámenes disponibles para un usuario
    public async getExamenesDisponibles(userId: number, dto: PaginationDto) {
        // Verificar si el usuario tiene una suscripción activa
        const suscripcion = await this.obtenerSuscripcion(userId);

        if (!suscripcion) {
            throw new BadRequestException('No tienes una suscripción activa');
        }

        const now = new Date();

        // Filtro base para exámenes disponibles (activados y publicados)
        const baseWhere = {
            estado: EstadoExamen.PUBLICADO,
            fechaActivacion: {
                lte: now,
            },
            ...dto.where, // Incluir filtros adicionales del dto
        };

        // Si es una suscripción individual, solo mostrar ese examen específico
        if (suscripcion.tipo === 'INDIVIDUAL' && suscripcion.examenId) {
            return this.getPaginatedData(
                dto,
                {
                    id: suscripcion.examenId,
                    ...baseWhere,
                },
                {
                    test: {
                        select: {
                            duration: true,
                        },
                    },
                }
            );
        }

        // Para suscripciones PRO o NORMAL, mostrar todos los exámenes disponibles
        // PRO puede ver todos, NORMAL solo los públicos
        const tipoAccesoFilter = suscripcion.tipo === 'PRO'
            ? {}
            : { tipoAcceso: TipoAcceso.PUBLICO };

        return this.getPaginatedData(
            dto,
            {
                ...baseWhere,
                ...tipoAccesoFilter,
            },
            {
                test: {
                    select: {
                        id: true,
                        duration: true,
                    },
                },
            }
        );
    }

    // Iniciar un examen para un usuario
    public async startExamen(examenId: number, userId: number) {
        // Verificar si el examen existe
        const examen = await this.prisma.examen.findUnique({
            where: { id: examenId },
            include: {
                test: true,
            },
        });

        if (!examen) {
            throw new BadRequestException('Examen no encontrado');
        }

        const suscripcion = await this.obtenerSuscripcion(userId);

        if (!suscripcion) {
            throw new BadRequestException('No tienes una suscripción activa');
        }

        const tieneAcceso = suscripcion.tipo == 'PRO' || (suscripcion.tipo == 'NORMAL' && suscripcion.examenId == examenId);

        if (!tieneAcceso) {
            throw new BadRequestException('No tienes acceso a este examen');
        }

        // Verificar si el examen está disponible
        const now = new Date();
        if (examen.fechaActivacion && examen.fechaActivacion > now) {
            throw new BadRequestException('Este examen aún no está disponible');
        }

        // Crear un nuevo test asociado al examen
        const newTest = await this.prisma.test.create({
            data: {
                realizadorId: userId,
                status: TestStatus.CREADO,
                duration: examen.test.duration,
                examenId: examenId,
                endsAt: examen.test.duration ? new Date(Date.now() + examen.test.duration * 60000) : null,
            },
        });

        // Obtener preguntas del test original del examen
        const preguntasOriginales = await this.prisma.testPregunta.findMany({
            where: {
                testId: examen.testId,
            },
            include: {
                pregunta: true,
            },
        });

        if (preguntasOriginales.length === 0) {
            throw new BadRequestException('No hay preguntas disponibles para este examen');
        }

        // Crear las entradas en TestPregunta para el nuevo test
        const testPreguntasData = preguntasOriginales.map((tp) => ({
            testId: newTest.id,
            preguntaId: tp.preguntaId,
        }));

        await this.prisma.testPregunta.createMany({
            data: testPreguntasData,
        });

        // Recuperar el test con las preguntas asociadas
        return this.testService.getTestById(newTest.id);
    }

    // Obtener todos los exámenes (para administradores)
    public async getAllExamenes(dto: PaginationDto) {
        return this.getPaginatedData(
            dto,
            {
                ...dto.where,
            },
            {
                test: {
                    include: {
                        testPreguntas: {
                            include: {
                                pregunta: {
                                    include: {
                                        tema: true
                                    }
                                }
                            }
                        }
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        nombre: true,
                        apellidos: true,
                        email: true,
                    },
                },
            },
        );
    }

    // Eliminar un examen (solo para administradores)
    public async deleteExamen(examenId: number) {
        const examen = await this.prisma.examen.findUnique({
            where: { id: examenId },
            select: { testId: true },
        });

        if (!examen) {
            throw new BadRequestException('Examen no encontrado');
        }

        // Primero eliminamos el examen
        await this.prisma.examen.delete({
            where: {
                id: examenId,
            },
        });

        // Luego eliminamos el test asociado
        return this.prisma.test.delete({
            where: {
                id: examen.testId,
            },
        });
    }

    // Actualizar un examen (solo para administradores)
    public async updateExamen(examenId: number, dto: NewExamenDto) {
        return this.prisma.examen.update({
            where: {
                id: examenId,
            },
            data: {
                titulo: dto.titulo,
                descripcion: dto.descripcion,
                estado: dto.estado,
                tipoAcceso: dto.tipoAcceso,
                codigoAcceso: dto.codigoAcceso,
                fechaActivacion: dto.fechaActivacion ? new Date(dto.fechaActivacion) : null,
                fechaSolucion: dto.fechaSolucion ? new Date(dto.fechaSolucion) : null,
                relevancia: dto.relevancia || [],
                test: dto.duracion ? {
                    update: {
                        duration: dto.duracion,
                    },
                } : undefined,
            },
        });
    }

    // Publicar un examen (cambiar estado a PUBLICADO)
    public async publicarExamen(examenId: number) {
        return this.prisma.examen.update({
            where: {
                id: examenId,
            },
            data: {
                estado: EstadoExamen.PUBLICADO,
            },
        });
    }

    // Archivar un examen (cambiar estado a ARCHIVADO)
    public async archivarExamen(examenId: number) {
        return this.prisma.examen.update({
            where: {
                id: examenId,
            },
            data: {
                estado: EstadoExamen.ARCHIVADO,
            },
        });
    }

    // Añadir preguntas a un examen
    public async addPreguntasToExamen(examenId: number, preguntaIds: number[]) {
        const examen = await this.prisma.examen.findUnique({
            where: { id: examenId },
            select: { testId: true },
        });

        if (!examen) {
            throw new BadRequestException('Examen no encontrado');
        }

        // Crear las entradas en TestPregunta
        const testPreguntasData = preguntaIds.map((preguntaId) => ({
            testId: examen.testId,
            preguntaId,
        }));

        return this.prisma.testPregunta.createMany({
            data: testPreguntasData,
            skipDuplicates: true, // Evitar duplicados
        });
    }

    // Eliminar preguntas de un examen
    public async removePreguntasFromExamen(examenId: number, preguntaIds: number[]) {
        const examen = await this.prisma.examen.findUnique({
            where: { id: examenId },
            select: { testId: true },
        });

        if (!examen) {
            throw new BadRequestException('Examen no encontrado');
        }

        // Eliminar las entradas en TestPregunta
        return this.prisma.testPregunta.deleteMany({
            where: {
                testId: examen.testId,
                preguntaId: {
                    in: preguntaIds,
                },
            },
        });
    }

    // Actualizar el orden de las preguntas
    public async updatePreguntasOrder(examenId: number, preguntaIds: number[]) {
        const examen = await this.prisma.examen.findUnique({
            where: { id: examenId },
            select: { testId: true },
        });

        if (!examen) {
            throw new BadRequestException('Examen no encontrado');
        }

        // Actualizamos el orden de cada pregunta
        const updates = preguntaIds.map((preguntaId, index) =>
            this.prisma.testPregunta.updateMany({
                where: {
                    testId: examen.testId,
                    preguntaId: preguntaId
                },
                data: {
                    orden: index + 1
                }
            })
        );

        // Ejecutamos todas las actualizaciones en una transacción
        await this.prisma.$transaction(updates);

        // Devolvemos el examen actualizado
        return this.getExamenById(examenId);
    }

    // Actualizar el estado de reserva de una pregunta en un examen
    public async updatePreguntaReservaStatus(examenId: number, preguntaId: number, esReserva: boolean) {
        const examen = await this.prisma.examen.findUnique({
            where: { id: examenId },
            select: { testId: true },
        });

        if (!examen) {
            throw new BadRequestException('Examen no encontrado');
        }

        // Verificar si la pregunta existe en el test
        const testPregunta = await this.prisma.testPregunta.findFirst({
            where: {
                testId: examen.testId,
                preguntaId: preguntaId,
            },
        });

        if (!testPregunta) {
            throw new BadRequestException('La pregunta no pertenece a este examen');
        }

        // Actualizar el estado de reserva
        return this.prisma.testPregunta.update({
            where: {
                id: testPregunta.id,
            },
            data: {
                deReserva: esReserva,
            },
            include: {
                pregunta: true,
            },
        });
    }
}