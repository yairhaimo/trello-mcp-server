import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { z } from 'zod';
dotenv.config();
const app = express();
const port = process.env.PORT || 3123;
const trelloApiKey = process.env.TRELLO_API_KEY;
const trelloApiToken = process.env.TRELLO_API_TOKEN;
// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
// Create an MCP server
const server = new McpServer({
    name: 'Trello MCP Server',
    version: '1.0.0',
});
// Define resources
server.resource('boards', 'trello://boards', async (uri) => {
    const fetch = (await import('node-fetch')).default;
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
server.resource('lists', new ResourceTemplate('trello://boards/{boardId}/lists', { list: undefined }), async (uri, { boardId }) => {
    const fetch = (await import('node-fetch')).default;
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
server.resource('cards', new ResourceTemplate('trello://lists/{listId}/cards', { list: undefined }), async (uri, { listId }) => {
    const fetch = (await import('node-fetch')).default;
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
    name: z.string(),
    description: z.string().optional(),
    listId: z.string(),
}, async ({ name, description, listId }) => {
    try {
        const fetch = (await import('node-fetch')).default;
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
        const fetch = (await import('node-fetch')).default;
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
    boardId: z.string().describe('ID of the Trello board to get lists from'),
}, async ({ boardId }) => {
    try {
        const fetch = (await import('node-fetch')).default;
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
    cards: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        listId: z.string(),
    })),
}, async ({ cards }) => {
    try {
        const fetch = (await import('node-fetch')).default;
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
    cardId: z.string().describe('ID of the card to move'),
    listId: z.string().describe('ID of the destination list'),
    position: z.string().optional().describe('Position in the list (e.g. "top", "bottom")'),
}, async ({ cardId, listId, position = 'bottom' }) => {
    try {
        const fetch = (await import('node-fetch')).default;
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
    cardId: z.string().describe('ID of the card to comment on'),
    text: z.string().describe('Comment text'),
}, async ({ cardId, text }) => {
    try {
        const fetch = (await import('node-fetch')).default;
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
    boardId: z.string().describe('ID of the board to create the label in'),
    name: z.string().describe('Name of the label'),
    color: z
        .enum(['yellow', 'purple', 'blue', 'red', 'green', 'orange', 'black', 'sky', 'pink', 'lime'])
        .describe('Color of the label'),
}, async ({ boardId, name, color }) => {
    try {
        const fetch = (await import('node-fetch')).default;
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
    cardId: z.string().describe('ID of the card to add the label to'),
    labelId: z.string().describe('ID of the label to add'),
}, async ({ cardId, labelId }) => {
    try {
        const fetch = (await import('node-fetch')).default;
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
    cards: z.array(z.object({
        cardId: z.string().describe('ID of the card to move'),
        listId: z.string().describe('ID of the destination list'),
        position: z.string().optional().describe('Position in the list (e.g. "top", "bottom")'),
    })),
}, async ({ cards }) => {
    try {
        const fetch = (await import('node-fetch')).default;
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
    comments: z.array(z.object({
        cardId: z.string().describe('ID of the card to comment on'),
        text: z.string().describe('Comment text'),
    })),
}, async ({ comments }) => {
    try {
        const fetch = (await import('node-fetch')).default;
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
    labels: z.array(z.object({
        boardId: z.string().describe('ID of the board to create the label in'),
        name: z.string().describe('Name of the label'),
        color: z
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
        const fetch = (await import('node-fetch')).default;
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
    items: z.array(z.object({
        cardId: z.string().describe('ID of the card to add the label to'),
        labelId: z.string().describe('ID of the label to add'),
    })),
}, async ({ items }) => {
    try {
        const fetch = (await import('node-fetch')).default;
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
    listId: z.string().describe('ID of the list to get tickets from'),
    limit: z.number().optional().describe('Maximum number of cards to return'),
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
        const fetch = (await import('node-fetch')).default;
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
    const transport = new StdioServerTransport();
    await server.connect(transport);
})();
