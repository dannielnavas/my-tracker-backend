import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessage } from 'openai/resources/chat/completions';
import config from 'src/config';
import { TasksService } from 'src/tasks/services/tasks.service';

export interface OpenAIRequestDto {
  sprint_id: number;
  dateReport: Date;
}

@Injectable()
export class AiFunctionsService {
  private openai: OpenAI;
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    private tasksService: TasksService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.apiOpenAi,
    });
  }
  async chatCompletion(
    request: OpenAIRequestDto,
  ): Promise<ChatCompletionMessage> {
    console.log('request', request);
    const tasksDone = await this.tasksService.getTasksBySprintIdPreviousDay(
      request.sprint_id,
      request.dateReport,
    );
    const tasksToday = await this.tasksService.getTasksBySprintIdToday(
      request.sprint_id,
    );
    console.log(tasksDone);
    const prompt = `
    Eres un experto en comunicación efectiva y gestión de equipos. Tu objetivo es generar el discurso para la reunión diaria (Daily Scrum) utilizando exclusivamente la información proporcionada en las listas de tareas. No inventes ni añadas detalles que no estén presentes en los datos de entrada.

Utiliza la siguiente estructura:

    Introduce de manera concisa lo que se logró ayer.

    Expón claramente en qué se trabajará hoy.

    Identifica cualquier obstáculo o bloqueo. Si la información de obstáculos no está disponible, omite esta sección por completo para evitar alucinaciones.

El tono debe ser tranquilo, claro y profesional. El discurso final debe ser listo para ser leído.

Datos de entrada:

    Tareas completadas ayer: ${tasksDone.map((task) => task.title).join(', ')}

    Tareas para hoy: ${tasksToday.map((task) => task.title).join(', ')}
    `;

    const englishPrompt = `
    You are an expert in effective communication and team management. Your goal is to generate the perfect speech for a daily meeting (Daily Scrum) based on the tasks provided.

Use the following structure:

    Concise introduction of what was accomplished yesterday.

    Clear statement of what will be worked on today.

    Identification and communication of any obstacles or blockers that are preventing progress. If there are none, mention it to ensure transparency.

The tone should be direct, clear, and professional. Avoid unnecessary jargon. The final speech should be ready to be delivered.

Input data:

    Tasks completed yesterday: ${tasksDone.map((task) => task.title).join(', ')}

    Tasks for today: ${tasksToday.map((task) => task.title).join(', ')}
    `;
    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'gpt-4o-mini',
    });

    return completion.choices[0].message;
  }
}
