const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { welcome } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-roles')
        .setDescription('Manage automatic roles for new members')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a role to be automatically assigned to new members')
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription('The role to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role from being automatically assigned to new members')
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all roles that are automatically assigned to new members'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all automatic roles'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageGuild])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                ephemeral: true
            });
        }
        
        const subcommand = interaction.options.getSubcommand();
        
        try {
            const settings = welcome.getSettings(interaction.guild.id);
            const autoRoles = settings.roleIds || [];
            
            if (subcommand === 'add') {
                const role = interaction.options.getRole('role');
                
                if (role.managed) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Invalid Role', 'This role is managed by an integration and cannot be assigned manually.')],
                        ephemeral: true
                    });
                }
                
                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Invalid Role', 'I cannot assign this role because it is higher than my highest role.')],
                        ephemeral: true
                    });
                }
                
                if (autoRoles.includes(role.id)) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Role Already Added', 'This role is already being automatically assigned to new members.')],
                        ephemeral: true
                    });
                }
                
                welcome.addRole(interaction.guild.id, role.id);
                
                const embed = createSuccessEmbed(
                    'Role Added',
                    `${role} will now be automatically assigned to new members.`
                );
                
                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'remove') {
                const role = interaction.options.getRole('role');
                
                if (!autoRoles.includes(role.id)) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Role Not Found', 'This role is not being automatically assigned to new members.')],
                        ephemeral: true
                    });
                }
                
                welcome.removeRole(interaction.guild.id, role.id);
                
                const embed = createSuccessEmbed(
                    'Role Removed',
                    `${role} will no longer be automatically assigned to new members.`
                );
                
                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'list') {
                if (autoRoles.length === 0) {
                    return interaction.reply({ 
                        embeds: [createInfoEmbed('Auto Roles', 'There are no roles being automatically assigned to new members.')],
                        ephemeral: true
                    });
                }
                
                const rolesList = autoRoles.map(roleId => {
                    const role = interaction.guild.roles.cache.get(roleId);
                    return role ? `${role} (${roleId})` : `Unknown Role (${roleId})`;
                }).join('\n');
                
                const embed = createInfoEmbed(
                    'Auto Roles',
                    'The following roles are automatically assigned to new members:'
                )
                .setDescription(rolesList);
                
                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'clear') {
                if (autoRoles.length === 0) {
                    return interaction.reply({ 
                        embeds: [createInfoEmbed('Auto Roles', 'There are no roles being automatically assigned to new members.')],
                        ephemeral: true
                    });
                }
                
                welcome.updateSettings(interaction.guild.id, { roleIds: [] });
                
                const embed = createSuccessEmbed(
                    'Auto Roles Cleared',
                    'All automatic roles have been cleared.'
                );
                
                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error managing welcome roles:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while managing welcome roles.')],
                ephemeral: true
            });
        }
    }
};