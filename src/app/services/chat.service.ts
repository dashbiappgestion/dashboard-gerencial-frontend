import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MensajeChatUi {
  sender: string;
  content: string;
}

export interface SesionChatDto {
  sessionId: string;
  closed: boolean;
  userMessageCount: number;
  maxUserMessages: number;
  canContinue?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  messages: MensajeChatUi[];
}

export interface ItemListaSesionChatDto {
  sessionId: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  closed: boolean;
  userMessageCount: number;
  maxUserMessages: number;
  preview: string;
  canContinue: boolean;
}

export interface RespuestaEnvioChatDto {
  sessionId: string;
  reply: string;
  closed: boolean;
  sessionExpired?: boolean;
  messages?: MensajeChatUi[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl + '/chat';
  private readonly clienteId = this.resolverClienteId();

  private resolverClienteId(): string {
    const key = 'dashboard_chat_client_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ 'X-Client-Id': this.clienteId });
  }

  obtenerSesion(): Observable<SesionChatDto> {
    return this.http.get<SesionChatDto>(`${this.base}/sesion`, { headers: this.headers() });
  }

  nuevaSesion(): Observable<SesionChatDto> {
    return this.http.post<SesionChatDto>(`${this.base}/nueva-sesion`, {}, { headers: this.headers() });
  }

  listarSesiones(): Observable<ItemListaSesionChatDto[]> {
    return this.http.get<ItemListaSesionChatDto[]>(`${this.base}/sesiones`, { headers: this.headers() });
  }

  obtenerSesionPorId(sessionId: string): Observable<SesionChatDto> {
    return this.http.get<SesionChatDto>(`${this.base}/sesiones/${encodeURIComponent(sessionId)}`, {
      headers: this.headers(),
    });
  }

  enviarMensaje(sessionId: string | null, message: string): Observable<RespuestaEnvioChatDto> {
    return this.http.post<RespuestaEnvioChatDto>(
      `${this.base}/mensaje`,
      { sessionId, message },
      { headers: this.headers() },
    );
  }
}