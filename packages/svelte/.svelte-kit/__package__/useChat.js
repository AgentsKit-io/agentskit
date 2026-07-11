import { writable } from 'svelte/store';
import { createChatController } from '@agentskit/core';
/**
 * Svelte 5 store. Same shape as `@agentskit/react`'s hook return,
 * exposed as a `Readable<ChatState>` + action methods.
 */
export function createChatStore(config) {
    const controller = createChatController(config);
    const store = writable(controller.getState());
    const unsubscribe = controller.subscribe(() => store.set(controller.getState()));
    return {
        subscribe: store.subscribe,
        send: controller.send,
        stop: controller.stop,
        retry: controller.retry,
        edit: controller.edit,
        regenerate: controller.regenerate,
        setInput: controller.setInput,
        clear: controller.clear,
        proposeToolCall: controller.proposeToolCall,
        approve: controller.approve,
        deny: controller.deny,
        destroy: unsubscribe,
    };
}
