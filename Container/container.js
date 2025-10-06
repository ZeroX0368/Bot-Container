
const { ContainerBuilder, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');

/**
 * Build a ContainerBuilder from embed-like options
 * Maps standard embed properties to container components
 */
function buildContainerFromEmbedShape(embedOptions) {
    const container = new ContainerBuilder();
    
    // Set accent color (equivalent to embed color)
    if (embedOptions.color) {
        let color = embedOptions.color;
        if (typeof color === 'string' && color.startsWith('#')) {
            color = parseInt(color.replace('#', ''), 16);
        }
        container.setAccentColor(color);
    }
    
    // Add author information if present
    if (embedOptions.author) {
        let authorContent = '';
        if (embedOptions.author.name) {
            authorContent += `**${embedOptions.author.name}**`;
        }
        if (embedOptions.author.url) {
            authorContent = `[${authorContent || 'Author'}](${embedOptions.author.url})`;
        }
        if (authorContent) {
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(authorContent)
            );
        }
    }

    // Add title and description as text display
    let mainContent = '';
    if (embedOptions.title) {
        mainContent += `**${embedOptions.title}**\n\n`;
    }
    if (embedOptions.description) {
        mainContent += embedOptions.description;
    }
    
    if (mainContent) {
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(mainContent)
        );
    }

    // Add image if present using MediaGallery
    if (embedOptions.image && embedOptions.image.url) {
        try {
            container.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(embedOptions.image.url)
                    )
            );
        } catch (error) {
            console.warn('Failed to add image to container:', error);
        }
    }

    // Add thumbnail if present using MediaGallery
    if (embedOptions.thumbnail && embedOptions.thumbnail.url) {
        try {
            container.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(embedOptions.thumbnail.url)
                    )
            );
        } catch (error) {
            console.warn('Failed to add thumbnail to container:', error);
        }
    }
    
    // Add fields as simple text displays instead of sections to avoid validation errors
    if (embedOptions.fields && embedOptions.fields.length > 0) {
        embedOptions.fields.forEach(field => {
            const fieldContent = `**${field.name}**\n${field.value}`;
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(fieldContent)
            );
            
            // Add separator between fields
            container.addSeparatorComponents(separator => separator);
        });
    }
    
    // Add URL if present (note: ContainerBuilder doesn't support URLs directly)
    if (embedOptions.url) {
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`🔗 [View Link](${embedOptions.url})`)
        );
    }

    // Add footer and timestamp info
    if (embedOptions.footer || embedOptions.timestamp) {
        let footerContent = '';
        if (embedOptions.footer && embedOptions.footer.text) {
            footerContent += embedOptions.footer.text;
        }
        if (embedOptions.timestamp) {
            const time = embedOptions.timestamp instanceof Date 
                ? embedOptions.timestamp 
                : new Date();
            if (footerContent) footerContent += ' • ';
            footerContent += `<t:${Math.floor(time.getTime() / 1000)}:R>`;
        }
        
        if (footerContent) {
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${footerContent}*`)
            );
        }
        
        // Add footer icon as separate media gallery if present
        if (embedOptions.footer && embedOptions.footer.iconURL) {
            try {
                container.addMediaGalleryComponents(
                    new MediaGalleryBuilder()
                        .addItems(
                            new MediaGalleryItemBuilder().setURL(embedOptions.footer.iconURL)
                        )
                );
            } catch (error) {
                console.warn('Failed to add footer icon to container:', error);
            }
        }
    }
    
    return container;
}

/**
 * Quick container builders for common use cases
 */
function createSuccessContainer(text, client) {
    return buildContainerFromEmbedShape({
        description: `✅ ${text}`,
        color: '#00FF00',
        timestamp: new Date()
    });
}

function createErrorContainer(text, client) {
    return buildContainerFromEmbedShape({
        description: `❌ ${text}`,
        color: client?.config?.ErrorColor || '#ff0000',
        timestamp: new Date()
    });
}

function createInfoContainer(title, description, client) {
    return buildContainerFromEmbedShape({
        title: title,
        description: description,
        color: client?.config?.EmbedColor || '#0099ff',
        timestamp: new Date()
    });
}

module.exports = {
    buildContainerFromEmbedShape,
    createSuccessContainer,
    createErrorContainer,
    createInfoContainer
};