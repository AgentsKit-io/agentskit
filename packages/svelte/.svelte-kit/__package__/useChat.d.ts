import { type Readable } from 'svelte/store';
import type { ChatConfig, ChatController, ChatReturn, ChatState } from '@agentskit/core';
export interface SvelteChatStore extends Readable<ChatState> {
    send: ChatController['send'];
    stop: ChatController['stop'];
    retry: ChatController['retry'];
    edit: ChatController['edit'];
    regenerate: ChatController['regenerate'];
    setInput: ChatController['setInput'];
    clear: ChatController['clear'];
    proposeToolCall: ChatReturn['proposeToolCall'];
    approve: ChatController['approve'];
    deny: ChatController['deny'];
    destroy: () => void;
}
/**
 * Svelte 5 store. Same shape as `@agentskit/react`'s hook return,
 * exposed as a `Readable<ChatState>` + action methods.
 */
export declare function createChatStore(config: ChatConfig): SvelteChatStore;
//# sourceMappingURL=useChat.d.ts.map