const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createInfoEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { welcome } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-status')
        .setDescription('Check the current welcome system settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageGuild])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                ephemeral: true
            });
        }
        
        try {
            const settings = welcome.getSettings(interaction.guild.id);
            
            const embed = createInfoEmbed(
                'Welcome System Status',
                `The welcome system is currently **${settings.enabled ? 'enabled' : 'disabled'}**.`
            );
            
            // Add welcome channel
            if (settings.channelId) {
                const channel = interaction.guild.channels.cache.get(settings.channelId);
                embed.addFields({ 
                    name: 'Welcome Channel', 
                    value: channel ? `${channel} (${channel.id})` : `Unknown Channel (${settings.channelId})`,
                    inline: true
                });
            } else {
                embed.addFields({ name: 'Welcome Channel', value: 'Not set', inline: true });
            }
            
            // Add welcome message
            embed.addFields({ 
                name: 'Welcome Message', 
                value: settings.message || 'Default message',
                inline: false
            });
            
            // Add image settings
            embed.addFields({ 
                name: 'Welcome Image', 
                value: settings.useImage ? 'Enabled' : 'Disabled',
                inline: true
            });
            
            // Add color settings
            embed.addFields({ 
                name: 'Color', 
                value: settings.color || '#7289DA',
                inline: true
            });
            
            // Add DM settings
            embed.addFields({ 
                name: 'Welcome DM', 
                value: settings.dmEnabled ? 'Enabled' : 'Disabled',
                inline: true
            });
            
            if (settings.dmEnabled) {
                embed.addFields({ 
                    name: 'DM Message', 
                    value: settings.dmMessage || 'Default DM message',
                    inline: false
                });
            }
            
            // Add auto roles
            if (settings.roleIds && settings.roleIds.length > 0) {
                const rolesList = settings.roleIds.map(roleId => {
                    const role = interaction.guild.roles.cache.get(roleId);
                    return role ? `${role} (${roleId})` : `Unknown Role (${roleId})`;
                }).join('\n');
                
                embed.addFields({ 
                    name: 'Auto Roles', 
                    value: rolesList,
                    inline: false
                });
            } else {
                embed.addFields({ 
                    name: 'Auto Roles', 
                    value: 'No auto roles configured',
                    inline: false
                });
            }
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error checking welcome status:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while checking the welcome system status.')],
                ephemeral: true
            });
        }
    }
};