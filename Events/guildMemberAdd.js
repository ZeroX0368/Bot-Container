
const AutoroleSchema = require('../Schemas/autorole');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            // Get autorole settings for this guild
            const autoroleData = await AutoroleSchema.findOne({ guildId: member.guild.id });
            
            if (!autoroleData) return; // No autorole settings configured

            // Determine if the new member is a bot or human
            const isBot = member.user.bot;
            const rolesToAssign = isBot ? autoroleData.bots : autoroleData.humans;

            if (rolesToAssign.length === 0) return; // No roles to assign

            // Check if bot has permission to manage roles
            if (!member.guild.members.me.permissions.has('ManageRoles')) {
                console.log(`Missing ManageRoles permission in guild ${member.guild.name}`);
                return;
            }

            // Filter out roles that don't exist or are higher than bot's highest role
            const validRoles = [];
            const botHighestPosition = member.guild.members.me.roles.highest.position;

            for (const roleId of rolesToAssign) {
                const role = member.guild.roles.cache.get(roleId);
                if (role && role.position < botHighestPosition) {
                    validRoles.push(role);
                }
            }

            if (validRoles.length === 0) return; // No valid roles to assign

            // Assign the roles
            await member.roles.add(validRoles, `Autorole: ${isBot ? 'Bot' : 'Human'} joined`);
            
            console.log(`Assigned ${validRoles.length} autorole(s) to ${member.user.tag} in ${member.guild.name}`);

        } catch (error) {
            console.error('Error in guildMemberAdd autorole:', error);
        }
    },
};
