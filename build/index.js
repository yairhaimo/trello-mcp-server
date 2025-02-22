"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
dotenv_1.default.config();
const app = (0, express_1.default)();
const trelloApiKey = process.env.TRELLO_API_KEY;
const trelloApiToken = process.env.TRELLO_API_TOKEN;
// Enable CORS and JSON parsing
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Create an MCP server
const server = new mcp_js_1.McpServer({
    name: 'Trello MCP Server',
    version: '1.0.0',
});
// Define resources
server.resource('boards', 'trello://boards', async (uri) => {
    const response = await fetch(`https://api.trello.com/1/members/me/boards?key=${trelloApiKey}&token=${trelloApiToken}`);
    const data = await response.json();
    return {
        contents: [
            {
                uri: uri.href,
                text: JSON.stringify(data),
            },
        ],
    };
});
server.resource('lists', new mcp_js_1.ResourceTemplate('trello://boards/{boardId}/lists', { list: undefined }), async (uri, { boardId }) => {
    const response = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${trelloApiKey}&token=${trelloApiToken}`);
    const data = await response.json();
    return {
        contents: [
            {
                uri: uri.href,
                text: JSON.stringify(data),
            },
        ],
    };
});
server.resource('cards', new mcp_js_1.ResourceTemplate('trello://lists/{listId}/cards', { list: undefined }), async (uri, { listId }) => {
    const response = await fetch(`https://api.trello.com/1/lists/${listId}/cards?key=${trelloApiKey}&token=${trelloApiToken}`);
    const data = await response.json();
    return {
        contents: [
            {
                uri: uri.href,
                text: JSON.stringify(data),
            },
        ],
    };
});
// Define tools
server.tool('create-card', {
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    listId: zod_1.z.string(),
}, async ({ name, description, listId }) => {
    try {
        const response = await fetch(`https://api.trello.com/1/cards?key=${trelloApiKey}&token=${trelloApiToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                desc: description || '',
                idList: listId,
                pos: 'bottom',
            }),
        });
        const data = await response.json();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(data),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error creating card: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('get-boards', {}, async () => {
    try {
        const response = await fetch(`https://api.trello.com/1/members/me/boards?key=${trelloApiKey}&token=${trelloApiToken}`);
        const data = await response.json();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(data),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error getting boards: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('get-lists', {
    boardId: zod_1.z.string().describe('ID of the Trello board to get lists from'),
}, async ({ boardId }) => {
    try {
        const response = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${trelloApiKey}&token=${trelloApiToken}`);
        const data = await response.json();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(data),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error getting lists: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('create-cards', {
    cards: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        description: zod_1.z.string().optional(),
        listId: zod_1.z.string(),
    })),
}, async ({ cards }) => {
    try {
        const results = await Promise.all(cards.map(async (card) => {
            const response = await fetch(`https://api.trello.com/1/cards?key=${trelloApiKey}&token=${trelloApiToken}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: card.name,
                    desc: card.description || '',
                    idList: card.listId,
                    pos: 'bottom',
                }),
            });
            return await response.json();
        }));
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(results),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error creating cards: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('move-card', {
    cardId: zod_1.z.string().describe('ID of the card to move'),
    listId: zod_1.z.string().describe('ID of the destination list'),
    position: zod_1.z.string().optional().describe('Position in the list (e.g. "top", "bottom")'),
}, async ({ cardId, listId, position = 'bottom' }) => {
    try {
        const response = await fetch(`https://api.trello.com/1/cards/${cardId}?key=${trelloApiKey}&token=${trelloApiToken}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idList: listId,
                pos: position,
            }),
        });
        const data = await response.json();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(data),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error moving card: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('add-comment', {
    cardId: zod_1.z.string().describe('ID of the card to comment on'),
    text: zod_1.z.string().describe('Comment text'),
}, async ({ cardId, text }) => {
    try {
        const response = await fetch(`https://api.trello.com/1/cards/${cardId}/actions/comments?key=${trelloApiKey}&token=${trelloApiToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
            }),
        });
        const data = await response.json();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(data),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error adding comment: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('create-label', {
    boardId: zod_1.z.string().describe('ID of the board to create the label in'),
    name: zod_1.z.string().describe('Name of the label'),
    color: zod_1.z
        .enum(['yellow', 'purple', 'blue', 'red', 'green', 'orange', 'black', 'sky', 'pink', 'lime'])
        .describe('Color of the label'),
}, async ({ boardId, name, color }) => {
    try {
        const response = await fetch(`https://api.trello.com/1/labels?key=${trelloApiKey}&token=${trelloApiToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                color,
                idBoard: boardId,
            }),
        });
        const data = await response.json();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(data),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error creating label: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('add-label', {
    cardId: zod_1.z.string().describe('ID of the card to add the label to'),
    labelId: zod_1.z.string().describe('ID of the label to add'),
}, async ({ cardId, labelId }) => {
    try {
        const response = await fetch(`https://api.trello.com/1/cards/${cardId}/idLabels?key=${trelloApiKey}&token=${trelloApiToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                value: labelId,
            }),
        });
        const data = await response.json();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(data),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error adding label to card: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('move-cards', {
    cards: zod_1.z.array(zod_1.z.object({
        cardId: zod_1.z.string().describe('ID of the card to move'),
        listId: zod_1.z.string().describe('ID of the destination list'),
        position: zod_1.z.string().optional().describe('Position in the list (e.g. "top", "bottom")'),
    })),
}, async ({ cards }) => {
    try {
        const results = await Promise.all(cards.map(async (card) => {
            const response = await fetch(`https://api.trello.com/1/cards/${card.cardId}?key=${trelloApiKey}&token=${trelloApiToken}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idList: card.listId,
                    pos: card.position || 'bottom',
                }),
            });
            return await response.json();
        }));
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(results),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error moving cards: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('add-comments', {
    comments: zod_1.z.array(zod_1.z.object({
        cardId: zod_1.z.string().describe('ID of the card to comment on'),
        text: zod_1.z.string().describe('Comment text'),
    })),
}, async ({ comments }) => {
    try {
        const results = await Promise.all(comments.map(async (comment) => {
            const response = await fetch(`https://api.trello.com/1/cards/${comment.cardId}/actions/comments?key=${trelloApiKey}&token=${trelloApiToken}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: comment.text,
                }),
            });
            return await response.json();
        }));
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(results),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error adding comments: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('create-labels', {
    labels: zod_1.z.array(zod_1.z.object({
        boardId: zod_1.z.string().describe('ID of the board to create the label in'),
        name: zod_1.z.string().describe('Name of the label'),
        color: zod_1.z
            .enum([
            'yellow',
            'purple',
            'blue',
            'red',
            'green',
            'orange',
            'black',
            'sky',
            'pink',
            'lime',
        ])
            .describe('Color of the label'),
    })),
}, async ({ labels }) => {
    try {
        const results = await Promise.all(labels.map(async (label) => {
            const response = await fetch(`https://api.trello.com/1/labels?key=${trelloApiKey}&token=${trelloApiToken}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: label.name,
                    color: label.color,
                    idBoard: label.boardId,
                }),
            });
            return await response.json();
        }));
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(results),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error creating labels: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('add-labels', {
    items: zod_1.z.array(zod_1.z.object({
        cardId: zod_1.z.string().describe('ID of the card to add the label to'),
        labelId: zod_1.z.string().describe('ID of the label to add'),
    })),
}, async ({ items }) => {
    try {
        const results = await Promise.all(items.map(async (item) => {
            const response = await fetch(`https://api.trello.com/1/cards/${item.cardId}/idLabels?key=${trelloApiKey}&token=${trelloApiToken}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    value: item.labelId,
                }),
            });
            return await response.json();
        }));
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(results),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error adding labels to cards: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('get-tickets-by-list', {
    listId: zod_1.z.string().describe('ID of the list to get tickets from'),
    limit: zod_1.z.number().optional().describe('Maximum number of cards to return'),
}, async ({ listId, limit }) => {
    try {
        if (!trelloApiKey || !trelloApiToken) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Trello API credentials are not configured',
                    },
                ],
                isError: true,
            };
        }
        const url = new URL(`https://api.trello.com/1/lists/${listId}/cards`);
        url.searchParams.append('key', trelloApiKey);
        url.searchParams.append('token', trelloApiToken);
        if (limit) {
            url.searchParams.append('limit', limit.toString());
        }
        const response = await fetch(url.toString());
        const data = await response.json();
        if (!Array.isArray(data)) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to get tickets from list',
                    },
                ],
                isError: true,
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(data),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error getting tickets from list: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('archive-card', {
    cardId: zod_1.z.string().describe('ID of the card to archive'),
}, async ({ cardId }) => {
    try {
        if (!trelloApiKey || !trelloApiToken) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Trello API credentials are not configured',
                    },
                ],
                isError: true,
            };
        }
        const response = await fetch(`https://api.trello.com/1/cards/${cardId}?key=${trelloApiKey}&token=${trelloApiToken}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                closed: true,
            }),
        });
        const data = await response.json();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(data),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error archiving card: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
server.tool('archive-cards', {
    cardIds: zod_1.z.array(zod_1.z.string()).describe('IDs of the cards to archive'),
}, async ({ cardIds }) => {
    try {
        if (!trelloApiKey || !trelloApiToken) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Trello API credentials are not configured',
                    },
                ],
                isError: true,
            };
        }
        const results = await Promise.all(cardIds.map(async (cardId) => {
            const response = await fetch(`https://api.trello.com/1/cards/${cardId}?key=${trelloApiKey}&token=${trelloApiToken}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    closed: true,
                }),
            });
            return await response.json();
        }));
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(results),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error archiving cards: ${error}`,
                },
            ],
            isError: true,
        };
    }
});
// server.resource(
// 	'echo',
// 	new ResourceTemplate('echo://{message}', { list: undefined }),
// 	async (uri, { message }) => ({
// 		contents: [
// 			{
// 				uri: uri.href,
// 				text: `Resource echo: ${message}`,
// 			},
// 		],
// 	})
// );
// server.tool('echo', { message: z.string() }, async ({ message }) => ({
// 	content: [{ type: 'text', text: `Tool echo: ${message}` }],
// }));
// server.prompt('echo', { message: z.string() }, ({ message }) => ({
// 	messages: [
// 		{
// 			role: 'user',
// 			content: {
// 				type: 'text',
// 				text: `Please process this message: ${message}`,
// 			},
// 		},
// 	],
// }));
(async () => {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
})();
