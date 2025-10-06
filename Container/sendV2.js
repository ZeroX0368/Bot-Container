const { MessageFlags } = require('discord.js');
const { buildContainerFromEmbedShape } = require('./container');

/**
 * Check if an object is already a ContainerBuilder instance
 */
function isContainerBuilder(obj) {
    return obj && typeof obj === 'object' && typeof obj.setAccentColor === 'function';
}

/**
 * Send a message using ContainerBuilder (Components V2) instead of embeds
 * Automatically converts embeds to containers and adds the required flag
 */
async function sendV2(target, options) {
    const { embed, embeds, components = [], ...rest } = options;
    
    const containers = [];
    
    // Handle single embed - check if it's already a container or needs conversion
    if (embed) {
        if (isContainerBuilder(embed)) {
            containers.push(embed);
        } else {
            containers.push(buildContainerFromEmbedShape(embed));
        }
    }
    
    // Handle multiple embeds - check each one
    if (embeds && embeds.length > 0) {
        embeds.forEach(embedData => {
            if (isContainerBuilder(embedData)) {
                containers.push(embedData);
            } else {
                containers.push(buildContainerFromEmbedShape(embedData));
            }
        });
    }
    
    // Combine containers with existing components
    const allComponents = [...containers, ...components];
    
    // Send with Components V2 flag
    return await target.send({
        ...rest,
        components: allComponents,
        flags: MessageFlags.IsComponentsV2
    });
}

/**
 * Reply to an interaction using ContainerBuilder
 */
async function replyV2(interaction, options) {
    const { embed, embeds, components = [], ...rest } = options;
    
    const containers = [];
    
    if (embed) {
        if (isContainerBuilder(embed)) {
            containers.push(embed);
        } else {
            containers.push(buildContainerFromEmbedShape(embed));
        }
    }
    
    if (embeds && embeds.length > 0) {
        embeds.forEach(embedData => {
            if (isContainerBuilder(embedData)) {
                containers.push(embedData);
            } else {
                containers.push(buildContainerFromEmbedShape(embedData));
            }
        });
    }
    
    const allComponents = [...containers, ...components];
    
    return await interaction.reply({
        ...rest,
        components: allComponents,
        flags: MessageFlags.IsComponentsV2
    });
}

/**
 * Edit a reply using ContainerBuilder
 */
async function editReplyV2(interaction, options) {
    const { embed, embeds, components = [], ...rest } = options;
    
    const containers = [];
    
    if (embed) {
        if (isContainerBuilder(embed)) {
            containers.push(embed);
        } else {
            containers.push(buildContainerFromEmbedShape(embed));
        }
    }
    
    if (embeds && embeds.length > 0) {
        embeds.forEach(embedData => {
            if (isContainerBuilder(embedData)) {
                containers.push(embedData);
            } else {
                containers.push(buildContainerFromEmbedShape(embedData));
            }
        });
    }
    
    const allComponents = [...containers, ...components];
    
    return await interaction.editReply({
        ...rest,
        components: allComponents,
        flags: MessageFlags.IsComponentsV2
    });
}

/**
 * Follow up to an interaction using ContainerBuilder
 */
async function followUpV2(interaction, options) {
    const { embed, embeds, components = [], ...rest } = options;
    
    const containers = [];
    
    if (embed) {
        if (isContainerBuilder(embed)) {
            containers.push(embed);
        } else {
            containers.push(buildContainerFromEmbedShape(embed));
        }
    }
    
    if (embeds && embeds.length > 0) {
        embeds.forEach(embedData => {
            if (isContainerBuilder(embedData)) {
                containers.push(embedData);
            } else {
                containers.push(buildContainerFromEmbedShape(embedData));
            }
        });
    }
    
    const allComponents = [...containers, ...components];
    
    return await interaction.followUp({
        ...rest,
        components: allComponents,
        flags: MessageFlags.IsComponentsV2
    });
}

/**
 * Update an interaction using ContainerBuilder
 */
async function updateV2(interaction, options) {
    const { embed, embeds, components = [], ...rest } = options;
    
    const containers = [];
    
    if (embed) {
        if (isContainerBuilder(embed)) {
            containers.push(embed);
        } else {
            containers.push(buildContainerFromEmbedShape(embed));
        }
    }
    
    if (embeds && embeds.length > 0) {
        embeds.forEach(embedData => {
            if (isContainerBuilder(embedData)) {
                containers.push(embedData);
            } else {
                containers.push(buildContainerFromEmbedShape(embedData));
            }
        });
    }
    
    const allComponents = [...containers, ...components];
    
    return await interaction.update({
        ...rest,
        components: allComponents,
        flags: MessageFlags.IsComponentsV2
    });
}

module.exports = {
    sendV2,
    replyV2,
    editReplyV2,
    followUpV2,
    updateV2
};