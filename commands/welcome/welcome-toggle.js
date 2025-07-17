const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { welcome } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-toggle')
        .setDescription('Toggle the welcome system on or off')
        .addBooleanOption(option => 
            option.setName('enabled')
                .setDescription('Whether to enable or disable the welcome system')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageGuild])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                ephemeral: true
            });
        }
        
        const enabled = interaction.options.getBoolean('enabled');
        
        try {
            const settings = welcome.getSettings(interaction.guild.id);
            
            if (enabled && !settings.channelId) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Setup Required', 'Please set up the welcome system first using `/welcome-setup`.')],
                    ephemeral: true
                });
            }
            
            welcome.setEnabled(interaction.guild.id, enabled);
            
            const embed = createSuccessEmbed(
                'Welcome System Toggled',
                `The welcome system has been ${enabled ? 'enabled' : 'disabled'}.`
            );
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error toggling welcome system:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while toggling the welcome system.')],
                ephemeral: true
            });
        }
    }
};