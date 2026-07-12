import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ChatService, ItemListaSesionChatDto, MensajeChatUi, SesionChatDto } from '../../services/chat.service';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.scss',
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  private readonly chat = inject(ChatService);

  abierto = signal(false);
  vistaLista = signal(false);
  cargandoLista = signal(false);
  listaChats = signal<ItemListaSesionChatDto[]>([]);
  sessionId = signal<string | null>(null);
  mensajes = signal<MensajeChatUi[]>([]);
  cerrada = signal(false);
  mensajesUsuario = signal(0);
  maxMensajesUsuario = signal(8);
  procesando = signal(false);
  textoProcesando = signal('Analizando.');
  textoEntrada = '';

  private procesandoTimer: ReturnType<typeof setInterval> | null = null;
  private procesandoPaso = 0;
  private readonly procesandoVariantes = ['Analizando.', 'Analizando..', 'Analizando...', 'Analizando.'];

  ngOnInit(): void {
    this.chat.obtenerSesion().subscribe({ next: (s) => this.aplicarSesion(s) });
  }

  ngOnDestroy(): void {
    this.detenerAnimacionProcesando();
  }

  togglePanel(): void {
    this.abierto.update((v) => !v);
    if (!this.abierto()) this.vistaLista.set(false);
  }

  iniciarNuevoChat(): void {
    this.vistaLista.set(false);
    this.chat.nuevaSesion().subscribe({
      next: (s) => {
        this.aplicarSesion(s);
        this.cerrada.set(false);
      },
    });
  }

  abrirListaChats(): void {
    this.vistaLista.set(true);
    this.cargarListaChats();
  }

  volverAlChat(): void {
    this.vistaLista.set(false);
  }

  seleccionarChat(item: ItemListaSesionChatDto): void {
    this.cargandoLista.set(true);
    this.chat
      .obtenerSesionPorId(item.sessionId)
      .pipe(finalize(() => this.cargandoLista.set(false)))
      .subscribe({
        next: (s) => {
          this.aplicarSesion(s);
          this.vistaLista.set(false);
        },
      });
  }

  enviar(): void {
    const txt = (this.textoEntrada || '').trim();
    if (!txt || this.procesando() || this.cerrada()) return;
    this.mensajes.update((m) => [...m, { sender: 'USER', content: txt }]);
    this.textoEntrada = '';
    this.iniciarAnimacionProcesando();
    this.chat
      .enviarMensaje(this.sessionId(), txt)
      .pipe(finalize(() => this.detenerAnimacionProcesando()))
      .subscribe({
        next: (r) => {
          this.sessionId.set(r.sessionId);
          if (r.messages && r.messages.length > 0) this.mensajes.set(r.messages);
          else if (r.reply) this.mensajes.update((m) => [...m, { sender: 'ASSISTANT', content: r.reply }]);
          this.cerrada.set(!!r.closed || !!r.sessionExpired);
          const conteo = (r.messages ?? this.mensajes()).filter((x) => x.sender === 'USER').length;
          this.mensajesUsuario.set(conteo);
        },
        error: () =>
          this.mensajes.update((m) => [...m, { sender: 'ASSISTANT', content: 'No puedo realizar ello.' }]),
      });
  }

  mensajesRestantes(): number {
    return Math.max(0, this.maxMensajesUsuario() - this.mensajesUsuario());
  }

  formatoFechaLista(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  estadoLista(item: ItemListaSesionChatDto): string {
    return item.canContinue ? `${item.userMessageCount}/${item.maxUserMessages} mensajes` : 'Completado';
  }

  private cargarListaChats(): void {
    this.cargandoLista.set(true);
    this.chat
      .listarSesiones()
      .pipe(finalize(() => this.cargandoLista.set(false)))
      .subscribe({
        next: (items) => this.listaChats.set(items ?? []),
        error: () => this.listaChats.set([]),
      });
  }

  private aplicarSesion(s: SesionChatDto): void {
    this.sessionId.set(s.sessionId);
    const agotada = s.closed || s.userMessageCount >= (s.maxUserMessages ?? 8);
    this.cerrada.set(s.canContinue === false ? true : agotada);
    this.mensajesUsuario.set(s.userMessageCount);
    this.maxMensajesUsuario.set(s.maxUserMessages ?? 8);
    this.mensajes.set(s.messages ?? []);
  }

  private iniciarAnimacionProcesando(): void {
    this.procesando.set(true);
    this.procesandoPaso = 0;
    this.textoProcesando.set(this.procesandoVariantes[0]);
    this.limpiarTimerProcesando();
    this.procesandoTimer = setInterval(() => {
      this.procesandoPaso = (this.procesandoPaso + 1) % this.procesandoVariantes.length;
      this.textoProcesando.set(this.procesandoVariantes[this.procesandoPaso]);
    }, 500);
  }

  private detenerAnimacionProcesando(): void {
    this.limpiarTimerProcesando();
    this.procesando.set(false);
  }

  private limpiarTimerProcesando(): void {
    if (this.procesandoTimer) {
      clearInterval(this.procesandoTimer);
      this.procesandoTimer = null;
    }
  }
}